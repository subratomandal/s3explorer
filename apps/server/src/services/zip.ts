import archiver, { Archiver } from 'archiver';
import crypto from 'crypto';
import type { Readable } from 'stream';
import type { Response } from 'express';
import * as s3 from './s3.js';

// Zip downloads are a two-step handshake: POST validates the selection, expands
// folders into object keys and hands back a short-lived token; GET streams the
// archive. The split keeps the request body JSON (a selection can be thousands of
// keys, too long for a query string) while still letting the browser fetch the
// download through a plain <a download> -- native progress UI, resumable by the
// user, and never buffered in page memory.
const JOB_TTL = 2 * 60 * 1000;
// Caps how much a single zip can enumerate. Bounded listing time and a sane
// upper limit on archive size; the client tells the user to narrow the selection.
const MAX_ENTRIES = 10000;

export interface ZipSelection {
  key: string;
  isFolder: boolean;
}

interface ZipEntry {
  key: string;
  // Path inside the archive, relative to the folder the user was browsing.
  name: string;
}

export interface ZipJob {
  bucket: string;
  filename: string;
  entries: ZipEntry[];
  expires: number;
}

const jobs = new Map<string, ZipJob>();

function purgeExpiredJobs(): void {
  const now = Date.now();
  for (const [token, job] of jobs) {
    if (job.expires <= now) jobs.delete(token);
  }
}

function lastSegment(key: string): string {
  return key.split('/').filter(Boolean).pop() || key;
}

// Strip characters that are illegal in filenames on common OSes, preserve unicode.
function sanitizeZipName(name: string): string {
  const cleaned = name.replace(/[\\/:*?"<>|\x00-\x1f]/g, '_').trim();
  return `${cleaned || 'download'}.zip`;
}

// Single folder -> "folder.zip"; a selection inside a folder -> "<folder>.zip";
// a selection at the bucket root -> "<bucket>.zip".
function zipFilename(bucket: string, prefix: string, objects: ZipSelection[]): string {
  if (objects.length === 1) return sanitizeZipName(lastSegment(objects[0].key));
  return sanitizeZipName(prefix ? lastSegment(prefix) : bucket);
}

export async function createZipJob(
  bucket: string,
  prefix: string,
  objects: ZipSelection[]
): Promise<{ token: string; filename: string; fileCount: number }> {
  purgeExpiredJobs();

  const seen = new Set<string>();
  const entries: ZipEntry[] = [];

  const add = (key: string) => {
    if (seen.has(key)) return;
    seen.add(key);
    // Keys always start with the browsed prefix; search results can come from
    // anywhere in the bucket, in which case the full key is the archive path.
    const name = key.startsWith(prefix) ? key.slice(prefix.length) : key;
    if (!name) return; // the folder marker for the prefix itself
    entries.push({ key, name });
    if (entries.length > MAX_ENTRIES) {
      const err: any = new Error(`Too many files to zip (limit ${MAX_ENTRIES.toLocaleString()}). Select fewer items.`);
      err.status = 400;
      throw err;
    }
  };

  for (const obj of objects) {
    if (obj.isFolder) {
      // Trailing slash keeps the listing scoped to this folder ("photos/" must not match "photos2/").
      const folderKey = obj.key.endsWith('/') ? obj.key : `${obj.key}/`;
      const remaining = MAX_ENTRIES - entries.length;
      const keys = await s3.listObjectKeys(bucket, folderKey, remaining);
      // An empty folder still gets a directory entry so it survives the round trip.
      add(folderKey);
      keys.forEach(add);
    } else {
      add(obj.key);
    }
  }

  if (entries.length === 0) {
    const err: any = new Error('Nothing to download');
    err.status = 400;
    throw err;
  }

  const token = crypto.randomBytes(16).toString('hex');
  const filename = zipFilename(bucket, prefix, objects);
  jobs.set(token, { bucket, filename, entries, expires: Date.now() + JOB_TTL });

  return { token, filename, fileCount: entries.filter(e => !e.name.endsWith('/')).length };
}

// Tokens are single-use: the GET consumes it, so a leaked download URL can't be replayed.
export function takeZipJob(token: string, bucket: string): ZipJob | undefined {
  const job = jobs.get(token);
  if (!job) return undefined;
  jobs.delete(token);
  if (job.expires <= Date.now() || job.bucket !== bucket) return undefined;
  return job;
}

// RFC 6266: ASCII fallback in filename= plus the UTF-8 form in filename*=.
function contentDisposition(filename: string): string {
  const ascii = filename.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
  const utf8 = encodeURIComponent(filename).replace(/['()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
  return `attachment; filename="${ascii}"; filename*=UTF-8''${utf8}`;
}

// Resolves once archiver has fully consumed the source. Entries are appended one
// at a time so only a single S3 GET is in flight, and archiver's backpressure
// pauses that stream whenever the browser is slow to read.
function appendEntry(archive: Archiver, source: Readable | Buffer, name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const onEntry = () => { cleanup(); resolve(); };
    const onError = (err: Error) => { cleanup(); reject(err); };
    const cleanup = () => {
      archive.off('entry', onEntry);
      archive.off('error', onError);
    };
    archive.once('entry', onEntry);
    archive.once('error', onError);
    archive.append(source, { name });
  });
}

export async function streamZip(job: ZipJob, res: Response): Promise<void> {
  // Level 1 keeps CPU low on small containers; the bottleneck is S3 -> browser
  // throughput, and most stored files (images, video, archives) don't compress anyway.
  const archive = archiver('zip', { zlib: { level: 1 } });
  let current: Readable | null = null;
  let aborted = false;

  // archiver swallows errors and never emits 'entry' once aborted, so every await
  // below races against this promise -- otherwise a client disconnect mid-entry
  // would leave this function (and the job's key list) pending forever.
  let rejectOnAbort: (err: Error) => void = () => {};
  const abortSignal = new Promise<never>((_, reject) => { rejectOnAbort = reject; });
  abortSignal.catch(() => {}); // nothing may be racing it when abort fires

  const abort = () => {
    if (aborted) return;
    aborted = true;
    current?.destroy();
    archive.abort();
    res.destroy();
    rejectOnAbort(new Error('Download aborted'));
  };

  // 'close' also fires after a normal finish; only treat it as a client disconnect
  // if the response never completed.
  res.on('close', () => {
    if (!res.writableFinished) abort();
  });
  archive.on('warning', err => console.warn('Zip warning:', err.message));
  archive.on('error', err => {
    console.error('Zip stream error:', err);
    abort();
  });

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', contentDisposition(job.filename));
  res.setHeader('Cache-Control', 'no-store');
  // Send headers before the first S3 round-trip so the browser shows the download
  // starting immediately instead of appearing to hang on large folders.
  res.flushHeaders();
  archive.pipe(res);

  try {
    for (const entry of job.entries) {
      if (aborted) return;

      if (entry.name.endsWith('/')) {
        await Promise.race([appendEntry(archive, Buffer.alloc(0), entry.name), abortSignal]);
        continue;
      }

      const { body } = await Promise.race([s3.getObjectStream(job.bucket, entry.key), abortSignal]);
      if (!body) {
        throw new Error(`Object not found: ${entry.key}`);
      }
      current = body as Readable;
      await Promise.race([appendEntry(archive, current, entry.name), abortSignal]);
      current = null;
    }
    await Promise.race([archive.finalize(), abortSignal]);
  } catch (err) {
    // Headers are already out, so the only honest signal is a truncated stream:
    // the browser reports the download as failed rather than saving a corrupt zip.
    if (!aborted) {
      console.error(`Zip download of "${job.filename}" failed:`, err);
      abort();
    }
  }
}
