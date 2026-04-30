import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import * as s3 from '../services/s3.js';
import { isValidBucketName } from '../utils/validation.js';
import { assertBucketAllowed } from '../utils/pinnedBucket.js';

const router = Router();

// File size limit (per file)
const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
const DATA_DIR = process.env.DATA_DIR || '/data';
const UPLOAD_TEMP_DIR = path.join(DATA_DIR, 'tmp-uploads');

if (!fs.existsSync(UPLOAD_TEMP_DIR)) {
  fs.mkdirSync(UPLOAD_TEMP_DIR, { recursive: true });
}

const upload = multer({
  dest: UPLOAD_TEMP_DIR,
  limits: { fileSize: MAX_FILE_SIZE }
});

// Sanitize filename - prevent path traversal, preserve unicode
function sanitizeFilename(filename: string): string {
  // Strip path components, then only remove truly dangerous characters
  return path.basename(filename).replace(/[<>:"|?*\x00-\x1f]/g, '_');
}

// Validate object key -- the ../ check blocks path traversal attacks that could
// escape the intended prefix and access/overwrite arbitrary keys in the bucket.
function isValidObjectKey(key: string): boolean {
  return key.length > 0 && Buffer.byteLength(key, 'utf8') <= 1024 && !key.includes('../');
}

// Helper to extract S3 error details
function getS3ErrorDetails(error: any): { message: string; s3Code?: string; status: number } {
  const s3Code = error.name || error.Code || error.$metadata?.httpStatusCode;
  const message = error.message || 'Operation failed';
  const status = error.status || error.$metadata?.httpStatusCode || 500;
  return { message, s3Code, status };
}

// Search files/folders across the entire bucket by substring match on the
// full object key (folder path + filename). Optionally scoped to a `prefix`
// to limit the scan to a subtree of the bucket.
// Must be defined before the /:bucket catch-all so Express matches it first.
router.get('/:bucket/search', async (req: Request, res: Response) => {
  try {
    const { bucket } = req.params;
    const query = (req.query.q as string || '').trim();
    const prefix = (req.query.prefix as string || '').trim() || undefined;

    if (!isValidBucketName(bucket)) {
      return res.status(400).json({ error: 'Invalid bucket name' });
    }
    assertBucketAllowed(bucket);
    if (!query || query.length < 2) {
      return res.json({ results: [] });
    }

    const results = await s3.searchObjects(bucket, query, undefined, undefined, prefix);
    res.json({ results });
  } catch (error: any) {
    console.error('Error searching objects:', error);
    const { message, s3Code, status } = getS3ErrorDetails(error);
    res.status(status).json({ error: message, s3Code });
  }
});

router.get('/:bucket', async (req: Request, res: Response) => {
  try {
    const { bucket } = req.params;
    if (!isValidBucketName(bucket)) {
      return res.status(400).json({ error: 'Invalid bucket name' });
    }
    assertBucketAllowed(bucket);

    const prefix = (req.query.prefix as string) || '';
    if (prefix && prefix.includes('../')) {
      return res.status(400).json({ error: 'Invalid prefix' });
    }
    const parsedMaxKeys = req.query.maxKeys ? parseInt(req.query.maxKeys as string, 10) : undefined;
    const maxKeys = parsedMaxKeys && !isNaN(parsedMaxKeys) ? Math.min(Math.max(parsedMaxKeys, 1), 1000) : undefined;
    const continuationToken = req.query.continuationToken ? (req.query.continuationToken as string) : undefined;
    const { objects, prefixes, nextContinuationToken, isTruncated } = await s3.listObjects(bucket, prefix, '/', maxKeys, continuationToken);
    res.json({ objects, prefixes, bucket, prefix, nextContinuationToken, isTruncated });
  } catch (error: any) {
    console.error('Error listing objects:', error);
    const { message, s3Code, status } = getS3ErrorDetails(error);
    res.status(status).json({ error: message, s3Code });
  }
});

router.get('/:bucket/proxy', async (req: Request, res: Response) => {
  try {
    const { bucket } = req.params;
    const key = req.query.key as string;

    if (!isValidBucketName(bucket)) {
      return res.status(400).json({ error: 'Invalid bucket name' });
    }
    assertBucketAllowed(bucket);
    if (!key || !isValidObjectKey(key)) {
      return res.status(400).json({ error: 'Invalid key' });
    }

    // Single GetObject call returns the stream and headers together. An earlier version
    // did HeadObject first for metadata, then GetObject for the body -- two round-trips
    // to S3 for every download. GetObject already includes content-type and content-length.
    const { body, contentType, contentLength } = await s3.getObjectStream(bucket, key);
    if (!body) {
      return res.status(404).json({ error: 'Object not found' });
    }

    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }

    // Handle stream errors during transfer
    const nodeStream = body as import('stream').Readable;
    nodeStream.on('error', (err: Error) => {
      console.error('Stream error during proxy:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Download interrupted' });
      } else {
        res.end();
      }
    });
    nodeStream.pipe(res);
  } catch (error: any) {
    console.error('Error proxying object:', error);
    const { message, s3Code, status } = getS3ErrorDetails(error);
    if (!res.headersSent) {
      res.status(status).json({ error: message, s3Code });
    }
  }
});

router.get('/:bucket/metadata', async (req: Request, res: Response) => {
  try {
    const { bucket } = req.params;
    const key = req.query.key as string;

    if (!isValidBucketName(bucket)) {
      return res.status(400).json({ error: 'Invalid bucket name' });
    }
    assertBucketAllowed(bucket);
    if (!key || !isValidObjectKey(key)) {
      return res.status(400).json({ error: 'Invalid key' });
    }

    const metadata = await s3.getObjectMetadata(bucket, key);
    res.json(metadata);
  } catch (error: any) {
    console.error('Error getting metadata:', error);
    const { message, s3Code, status } = getS3ErrorDetails(error);
    res.status(status).json({ error: message, s3Code });
  }
});

router.post('/:bucket/upload', upload.array('files'), async (req: Request, res: Response) => {
  const files = (req.files as Express.Multer.File[]) || [];

  try {
    const { bucket } = req.params;
    if (!isValidBucketName(bucket)) {
      return res.status(400).json({ error: 'Invalid bucket name' });
    }
    assertBucketAllowed(bucket);

    const prefix = (req.body.prefix as string) || '';

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }

    // Parse renamed names if provided (for handling duplicate names)
    let renamedNames: string[] | null = null;
    if (req.body.names) {
      try {
        renamedNames = JSON.parse(req.body.names);
      } catch {
        // Ignore parse errors, use original names
      }
    }

    const results = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      // Use renamed name if provided, otherwise use original
      const originalName = renamedNames && renamedNames[i] ? renamedNames[i] : file.originalname;
      const safeName = sanitizeFilename(originalName);
      const key = prefix ? `${prefix}${safeName}` : safeName;

      if (!isValidObjectKey(key)) {
        continue; // Skip invalid keys
      }

      await s3.uploadFile(bucket, key, file.path, file.size, file.mimetype);
      results.push({ key, size: file.size });
    }

    res.json({ success: true, uploaded: results });
  } catch (error: any) {
    console.error('Error uploading files:', error);
    const { message, s3Code, status } = getS3ErrorDetails(error);
    res.status(status).json({ error: message, s3Code });
  } finally {
    // Multer writes uploads to disk before we read them into Buffer payloads.
    // Always clean up temp files -- even on error -- to prevent disk fill on
    // repeated failures. allSettled so one unlink failure doesn't block the rest.
    await Promise.allSettled(
      files
        .filter(file => file.path)
        .map(file => fs.promises.unlink(file.path))
    );
  }
});

router.post('/:bucket/folder', async (req: Request, res: Response) => {
  try {
    const { bucket } = req.params;
    const { path: folderPath } = req.body;

    if (!isValidBucketName(bucket)) {
      return res.status(400).json({ error: 'Invalid bucket name' });
    }
    assertBucketAllowed(bucket);
    if (!folderPath || !isValidObjectKey(folderPath)) {
      return res.status(400).json({ error: 'Invalid path' });
    }

    await s3.createFolder(bucket, folderPath);
    res.json({ success: true, message: `Folder created` });
  } catch (error: any) {
    console.error('Error creating folder:', error);
    const { message, s3Code, status } = getS3ErrorDetails(error);
    res.status(status).json({ error: message, s3Code });
  }
});

router.put('/:bucket/rename', async (req: Request, res: Response) => {
  try {
    const { bucket } = req.params;
    const { oldKey, newKey } = req.body;

    if (!isValidBucketName(bucket)) {
      return res.status(400).json({ error: 'Invalid bucket name' });
    }
    assertBucketAllowed(bucket);
    if (!oldKey || !newKey || !isValidObjectKey(oldKey) || !isValidObjectKey(newKey)) {
      return res.status(400).json({ error: 'Invalid keys' });
    }

    if (oldKey === newKey) {
      return res.json({ success: true, message: 'No change needed' });
    }

    await s3.renameObject(bucket, oldKey, newKey);
    res.json({ success: true, message: 'Renamed successfully' });
  } catch (error: any) {
    console.error('Error renaming object:', error);
    const { message, s3Code, status } = getS3ErrorDetails(error);
    res.status(status).json({ error: message, s3Code });
  }
});

router.post('/:bucket/copy', async (req: Request, res: Response) => {
  try {
    const { bucket } = req.params;
    const { sourceKey, destBucket, destKey } = req.body;

    if (!isValidBucketName(bucket)) {
      return res.status(400).json({ error: 'Invalid bucket name' });
    }
    assertBucketAllowed(bucket);
    if (destBucket && !isValidBucketName(destBucket)) {
      return res.status(400).json({ error: 'Invalid destination bucket name' });
    }
    // destBucket in the body is the one the URL-param guard can't see.
    // Check it here so a pinned connection can't copy OUT to another bucket.
    assertBucketAllowed(destBucket || bucket);
    if (!sourceKey || !destKey || !isValidObjectKey(sourceKey) || !isValidObjectKey(destKey)) {
      return res.status(400).json({ error: 'Invalid keys' });
    }

    await s3.copyObject(bucket, sourceKey, destBucket || bucket, destKey);
    res.json({ success: true, message: 'Copied successfully' });
  } catch (error: any) {
    console.error('Error copying object:', error);
    const { message, s3Code, status } = getS3ErrorDetails(error);
    res.status(status).json({ error: message, s3Code });
  }
});

router.delete('/:bucket', async (req: Request, res: Response) => {
  try {
    const { bucket } = req.params;
    const key = req.query.key as string;
    const isFolder = req.query.isFolder === 'true';

    if (!isValidBucketName(bucket)) {
      return res.status(400).json({ error: 'Invalid bucket name' });
    }
    assertBucketAllowed(bucket);
    if (!key || !isValidObjectKey(key)) {
      return res.status(400).json({ error: 'Invalid key' });
    }

    if (isFolder) {
      await s3.deleteFolder(bucket, key);
    } else {
      await s3.deleteObject(bucket, key);
    }

    res.json({ success: true, message: 'Deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting object:', error);
    const { message, s3Code, status } = getS3ErrorDetails(error);
    res.status(status).json({ error: message, s3Code });
  }
});

// Batch delete objects
router.post('/:bucket/batch-delete', async (req: Request, res: Response) => {
  try {
    const { bucket } = req.params;
    const { objects } = req.body;

    if (!isValidBucketName(bucket)) {
      return res.status(400).json({ error: 'Invalid bucket name' });
    }
    assertBucketAllowed(bucket);

    if (!Array.isArray(objects) || objects.length === 0) {
      return res.status(400).json({ error: 'No objects specified' });
    }

    const deleted: string[] = [];
    const failed: string[] = [];

    for (const obj of objects) {
      try {
        if (!obj.key || !isValidObjectKey(obj.key)) {
          failed.push(obj.key || 'unknown');
          continue;
        }

        if (obj.isFolder) {
          await s3.deleteFolder(bucket, obj.key);
        } else {
          await s3.deleteObject(bucket, obj.key);
        }
        deleted.push(obj.key);
      } catch (err) {
        console.error(`Failed to delete ${obj.key}:`, err);
        failed.push(obj.key);
      }
    }

    res.json({ deleted, failed });
  } catch (error: any) {
    console.error('Error in batch delete:', error);
    const { message, s3Code, status } = getS3ErrorDetails(error);
    res.status(status).json({ error: message, s3Code });
  }
});

export default router;
