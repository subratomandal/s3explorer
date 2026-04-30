import {
  S3Client,
  ListBucketsCommand,
  CreateBucketCommand,
  DeleteBucketCommand,
  ListObjectsV2Command,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  CopyObjectCommand,
  HeadObjectCommand,
  DeleteObjectsCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} from '@aws-sdk/client-s3';
import fs from 'fs';
import { connections } from './db.js';
import { unpackAndDecrypt } from './crypto.js';
import type { BucketInfo, ObjectInfo, ObjectMetadata } from '../types/index.js';

export type { BucketInfo, ObjectInfo, ObjectMetadata };

export interface S3ConnectionConfig {
  endpoint: string;
  accessKey: string;
  secretKey: string;
  region?: string;
  forcePathStyle?: boolean;
}

// A new S3Client is built per call instead of being cached globally. The active
// connection can change at any time (user switches connections in the UI), and the
// AWS SDK caches internal state per client, so reusing a stale client would silently
// talk to the wrong endpoint.
//
// requestChecksumCalculation/responseChecksumValidation are pinned to WHEN_REQUIRED
// because @aws-sdk/client-s3 v3.729+ defaults them to WHEN_SUPPORTED, which auto-adds
// CRC32 checksum trailers + aws-chunked encoding to PutObject/UploadPart. Non-AWS
// S3-compatible providers (GCS, Cloudflare R2, Backblaze B2, older MinIO) don't
// implement those headers and reject the request with SignatureDoesNotMatch.
// WHEN_REQUIRED still emits checksums for operations that mandate them (e.g.
// DeleteObjects), so AWS S3 behavior is unchanged.
function getS3Client(configOverride?: S3ConnectionConfig): S3Client {
  if (configOverride) {
    return new S3Client({
      endpoint: configOverride.endpoint,
      region: configOverride.region || 'us-east-1',
      credentials: {
        accessKeyId: configOverride.accessKey,
        secretAccessKey: configOverride.secretKey,
      },
      forcePathStyle: configOverride.forcePathStyle ?? true,
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    });
  }

  // Get active connection from DB
  const active = connections.getActive();

  if (!active) {
    throw new Error('No active S3 connection. Please add and activate a connection.');
  }

  // Decrypt credentials
  const accessKey = unpackAndDecrypt(active.access_key_enc);
  const secretKey = unpackAndDecrypt(active.secret_key_enc);

  return new S3Client({
    endpoint: active.endpoint,
    region: active.region || 'us-east-1',
    credentials: {
      accessKeyId: accessKey,
      secretAccessKey: secretKey,
    },
    forcePathStyle: !!active.force_path_style,
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  });
}

export async function listBuckets(config?: S3ConnectionConfig): Promise<BucketInfo[]> {
  const client = getS3Client(config);
  const command = new ListBucketsCommand({});
  const response = await client.send(command);

  return (response.Buckets || []).map(bucket => ({
    name: bucket.Name || '',
    creationDate: bucket.CreationDate,
  }));
}

// Lightweight connectivity test for single-bucket connections (e.g., GCS).
// ListBuckets isn't available on these providers, so we list one object instead.
export async function testBucketAccess(config: S3ConnectionConfig, bucket: string): Promise<void> {
  const client = getS3Client(config);
  await client.send(new ListObjectsV2Command({ Bucket: bucket, MaxKeys: 1 }));
}

export async function createBucket(name: string): Promise<void> {
  const client = getS3Client();
  const command = new CreateBucketCommand({ Bucket: name });
  await client.send(command);
}

// S3 won't let you delete a bucket that still has objects. We drain it first
// by paginating through all objects and batch-deleting them.
async function emptyBucket(bucket: string): Promise<void> {
  const client = getS3Client();
  let continuationToken: string | undefined;

  do {
    const listCommand = new ListObjectsV2Command({
      Bucket: bucket,
      ContinuationToken: continuationToken,
    });
    const listResponse = await client.send(listCommand);

    if (listResponse.Contents && listResponse.Contents.length > 0) {
      const deleteCommand = new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: {
          Objects: listResponse.Contents.map(obj => ({ Key: obj.Key })),
          Quiet: true,
        },
      });
      await client.send(deleteCommand);
    }

    continuationToken = listResponse.NextContinuationToken;
  } while (continuationToken);
}

export async function deleteBucket(name: string): Promise<void> {
  const client = getS3Client();
  await emptyBucket(name);
  const command = new DeleteBucketCommand({ Bucket: name });
  await client.send(command);
}

export async function listObjects(
  bucket: string,
  prefix: string = '',
  delimiter: string = '/',
  maxKeys?: number,
  continuationToken?: string
): Promise<{ objects: ObjectInfo[]; prefixes: string[]; nextContinuationToken?: string; isTruncated: boolean }> {
  const client = getS3Client();
  const command = new ListObjectsV2Command({
    Bucket: bucket,
    Prefix: prefix,
    Delimiter: delimiter,
    ...(maxKeys !== undefined && { MaxKeys: maxKeys }),
    ...(continuationToken !== undefined && { ContinuationToken: continuationToken }),
  });
  const response = await client.send(command);

  const objects: ObjectInfo[] = (response.Contents || [])
    .filter(obj => obj.Key !== prefix)
    .map(obj => ({
      key: obj.Key || '',
      size: obj.Size || 0,
      lastModified: obj.LastModified,
      isFolder: false,
    }));

  const prefixes = (response.CommonPrefixes || []).map(p => p.Prefix || '');

  prefixes.forEach(p => {
    objects.push({
      key: p,
      size: 0,
      isFolder: true,
    });
  });

  return {
    objects,
    prefixes,
    nextContinuationToken: response.NextContinuationToken,
    isTruncated: response.IsTruncated ?? false,
  };
}

export async function getObjectStream(bucket: string, key: string) {
  const client = getS3Client();
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  const response = await client.send(command);
  return {
    body: response.Body,
    contentType: response.ContentType,
    contentLength: response.ContentLength,
  };
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

async function listAllObjectKeys(client: S3Client, bucket: string, prefix: string): Promise<string[]> {
  const keys: string[] = [];
  let continuationToken: string | undefined;

  do {
    const response = await client.send(new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      ContinuationToken: continuationToken,
    }));

    for (const obj of response.Contents || []) {
      if (obj.Key) {
        keys.push(obj.Key);
      }
    }

    continuationToken = response.NextContinuationToken;
  } while (continuationToken);

  return keys;
}

async function deleteObjectWithClient(client: S3Client, bucket: string, key: string): Promise<void> {
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

// 100MB threshold: below this, a single PutObject is simpler and has less overhead.
// Above it, multipart gives us parallel uploads and bounded memory.
const MULTIPART_THRESHOLD = 100 * 1024 * 1024;
// 10MB parts: S3 minimum is 5MB, but 10MB reduces the total number of parts (and API
// calls) while still keeping memory per part reasonable for the server.
const PART_SIZE = 10 * 1024 * 1024;
// Max concurrent in-flight UploadPart requests. Caps peak memory at
// PART_CONCURRENCY * PART_SIZE = 50MB regardless of file size.
const PART_CONCURRENCY = 5;

// Uploads a file from disk. Always sends Buffer-shaped bodies, never a Readable
// stream -- streaming Body triggers chunked SigV4 signing
// (`x-amz-content-sha256: STREAMING-AWS4-HMAC-SHA256-PAYLOAD` + `Content-Encoding:
// aws-chunked`), which Google Cloud Storage's S3 interop layer rejects with
// SignatureDoesNotMatch. Buffer bodies get hashed once, signed once, and verified
// the same way by every S3-compatible provider.
//
// Memory: small files load fully (≤ MULTIPART_THRESHOLD); large files use
// positional fd.read so we never hold more than PART_CONCURRENCY * PART_SIZE in
// memory regardless of total file size.
export async function uploadFile(
  bucket: string,
  key: string,
  filePath: string,
  size: number,
  contentType?: string
): Promise<void> {
  const client = getS3Client();

  if (size <= MULTIPART_THRESHOLD) {
    const body = await fs.promises.readFile(filePath);
    await client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }));
    return;
  }

  const fd = await fs.promises.open(filePath, 'r');
  let uploadId: string | undefined;

  try {
    const created = await client.send(new CreateMultipartUploadCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
    }));
    uploadId = created.UploadId;
    if (!uploadId) {
      throw new Error('Failed to initiate multipart upload');
    }

    const totalParts = Math.ceil(size / PART_SIZE);
    const parts: { ETag: string; PartNumber: number }[] = [];

    for (let i = 0; i < totalParts; i += PART_CONCURRENCY) {
      const batch: Promise<{ ETag: string; PartNumber: number }>[] = [];
      for (let j = i; j < Math.min(i + PART_CONCURRENCY, totalParts); j++) {
        const partNumber = j + 1;
        const offset = j * PART_SIZE;
        const length = Math.min(PART_SIZE, size - offset);
        // allocUnsafe is fine: fd.read overwrites the full range we hand it.
        const buf = Buffer.allocUnsafe(length);
        await fd.read(buf, 0, length, offset);

        batch.push(
          client.send(new UploadPartCommand({
            Bucket: bucket,
            Key: key,
            UploadId: uploadId,
            PartNumber: partNumber,
            Body: buf,
          })).then(result => ({
            ETag: result.ETag!,
            PartNumber: partNumber,
          }))
        );
      }
      parts.push(...await Promise.all(batch));
    }

    // S3 requires parts ordered by PartNumber on completion.
    parts.sort((a, b) => a.PartNumber - b.PartNumber);

    await client.send(new CompleteMultipartUploadCommand({
      Bucket: bucket,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: { Parts: parts },
    }));
  } catch (error) {
    if (uploadId) {
      try {
        await client.send(new AbortMultipartUploadCommand({
          Bucket: bucket,
          Key: key,
          UploadId: uploadId,
        }));
      } catch (abortError) {
        console.error('Failed to abort multipart upload:', abortError);
      }
    }
    throw error;
  } finally {
    await fd.close();
  }
}

export async function deleteObject(bucket: string, key: string): Promise<void> {
  const client = getS3Client();
  await deleteObjectWithClient(client, bucket, key);
}

export async function deleteFolder(bucket: string, prefix: string): Promise<void> {
  const client = getS3Client();
  const keys = await listAllObjectKeys(client, bucket, prefix);

  for (const keyBatch of chunk(keys, 1000)) {
    const deleteCommand = new DeleteObjectsCommand({
      Bucket: bucket,
      Delete: {
        Objects: keyBatch.map(Key => ({ Key })),
        Quiet: true,
      },
    });
    await client.send(deleteCommand);
  }
}

async function parallelExecute<T>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<void>
): Promise<void> {
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    await Promise.all(batch.map(fn));
  }
}

export async function renameObject(
  bucket: string,
  oldKey: string,
  newKey: string
): Promise<void> {
  if (oldKey === newKey) return; // No-op if name unchanged

  const client = getS3Client();
  const isFolder = oldKey.endsWith('/');

  if (isFolder) {
    // S3 has no native rename -- we simulate it with copy-then-delete.
    // Folder rename is a two-phase operation for safety:
    //   Phase 1: copy everything to the new prefix (original data is untouched)
    //   Phase 2: delete originals
    // If Phase 2 fails, we roll back by deleting the copies so the user doesn't
    // end up with duplicated data in both locations.
    const keys = await listAllObjectKeys(client, bucket, oldKey);

    const keyMappings = keys.map(key => ({
      oldKey: key,
      newKey: key.startsWith(oldKey)
        ? `${newKey}${key.slice(oldKey.length)}`
        : key.replace(oldKey, newKey),
    }));

    // Phase 1: Copy ALL objects to new location (parallel, 10 concurrent)
    await parallelExecute(keyMappings, 10, async (mapping) => {
      const copyCommand = new CopyObjectCommand({
        Bucket: bucket,
        CopySource: encodeURIComponent(`${bucket}/${mapping.oldKey}`),
        Key: mapping.newKey,
      });
      await client.send(copyCommand);
    });

    // Phase 2: Batch delete originals using DeleteObjectsCommand (chunks of 1000)
    // If delete fails, rollback by removing the copies to avoid duplication
    try {
      for (const keyBatch of chunk(keys, 1000)) {
        const deleteCommand = new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: {
            Objects: keyBatch.map(Key => ({ Key })),
            Quiet: true,
          },
        });
        await client.send(deleteCommand);
      }
    } catch (deleteError) {
      console.error('Rename Phase 2 (delete originals) failed, rolling back copies:', deleteError);
      // Rollback: delete the copies we made in Phase 1
      const newKeys = keyMappings.map(m => m.newKey);
      try {
        for (const keyBatch of chunk(newKeys, 1000)) {
          await client.send(new DeleteObjectsCommand({
            Bucket: bucket,
            Delete: { Objects: keyBatch.map(Key => ({ Key })), Quiet: true },
          }));
        }
      } catch (rollbackError) {
        console.error('Rename rollback also failed:', rollbackError);
      }
      throw deleteError;
    }
  } else {
    const copyCommand = new CopyObjectCommand({
      Bucket: bucket,
      CopySource: encodeURIComponent(`${bucket}/${oldKey}`),
      Key: newKey,
    });
    await client.send(copyCommand);

    await deleteObjectWithClient(client, bucket, oldKey);
  }
}

export async function copyObject(
  sourceBucket: string,
  sourceKey: string,
  destBucket: string,
  destKey: string
): Promise<void> {
  const client = getS3Client();
  const command = new CopyObjectCommand({
    Bucket: destBucket,
    CopySource: encodeURIComponent(`${sourceBucket}/${sourceKey}`),
    Key: destKey,
  });
  await client.send(command);
}

export async function createFolder(bucket: string, path: string): Promise<void> {
  const client = getS3Client();
  const folderKey = path.endsWith('/') ? path : `${path}/`;
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: folderKey,
    Body: Buffer.alloc(0),
  });
  await client.send(command);
}

// Recursive search across all objects in a bucket. S3 has no native substring
// search, so we list everything without a delimiter and match keys manually.
// Matches against the full object key (folder path + filename), so users can
// find files by any substring of their path — e.g. "2024/q1" or "invoice".
// Whitespace in the query is treated as an AND of substrings (all must match).
// An optional `prefix` scopes the scan to a subtree to keep large buckets fast.
// Capped at maxResults matches or maxScanned total objects to avoid runaway requests.
export async function searchObjects(
  bucket: string,
  query: string,
  maxResults: number = 200,
  maxScanned: number = 50000,
  prefix?: string
): Promise<ObjectInfo[]> {
  const client = getS3Client();
  const tokens = query
    .toLowerCase()
    .split(/\s+/)
    .map(t => t.trim())
    .filter(Boolean);
  if (tokens.length === 0) return [];

  const results: ObjectInfo[] = [];
  const seen = new Set<string>();
  let scanned = 0;
  let continuationToken: string | undefined;

  do {
    const command = new ListObjectsV2Command({
      Bucket: bucket,
      // No Delimiter — list recursively across all "folders"
      ...(prefix && { Prefix: prefix }),
      ...(continuationToken && { ContinuationToken: continuationToken }),
      MaxKeys: 1000,
    });
    const response = await client.send(command);

    for (const obj of response.Contents || []) {
      scanned++;
      const key = obj.Key || '';
      if (!key) continue;

      // Match against the full key path (lowercased). All tokens must appear.
      const lowerKey = key.toLowerCase();
      if (!tokens.every(t => lowerKey.includes(t))) continue;

      if (!seen.has(key)) {
        seen.add(key);
        results.push({
          key,
          size: obj.Size || 0,
          lastModified: obj.LastModified,
          isFolder: key.endsWith('/'),
        });
      }

      // Surface the parent folder when a query token matches a path segment but
      // not the filename — makes folder hits discoverable in the results list.
      const segments = key.split('/');
      const fileName = segments.pop() || '';
      if (segments.length > 0 && !tokens.every(t => fileName.toLowerCase().includes(t))) {
        let acc = '';
        for (const seg of segments) {
          if (!seg) continue;
          acc += `${seg}/`;
          const lowerAcc = acc.toLowerCase();
          if (tokens.every(t => lowerAcc.includes(t)) && !seen.has(acc)) {
            seen.add(acc);
            results.push({ key: acc, size: 0, lastModified: undefined, isFolder: true });
            if (results.length >= maxResults) break;
          }
        }
      }

      if (results.length >= maxResults) break;
    }

    continuationToken = response.NextContinuationToken;
  } while (continuationToken && results.length < maxResults && scanned < maxScanned);

  return results;
}

export async function getObjectMetadata(bucket: string, key: string): Promise<ObjectMetadata> {
  const client = getS3Client();
  const command = new HeadObjectCommand({ Bucket: bucket, Key: key });
  const response = await client.send(command);
  return {
    contentType: response.ContentType,
    contentLength: response.ContentLength,
    lastModified: response.LastModified,
    metadata: response.Metadata,
  };
}
