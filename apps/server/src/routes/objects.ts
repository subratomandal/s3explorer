import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import * as s3 from '../services/s3.js';

const router = Router();

// File size limits
const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB limit (multipart handles larger files)

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE }
});

// Sanitize filename - prevent path traversal
function sanitizeFilename(filename: string): string {
  return path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, '_');
}

// Validate bucket name
function isValidBucketName(name: string): boolean {
  // S3 bucket naming rules (simplified)
  return /^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(name) && !name.includes('..');
}

// Validate object key
function isValidObjectKey(key: string): boolean {
  return key.length > 0 && key.length <= 1024 && !key.includes('../');
}

// Helper to extract S3 error details
function getS3ErrorDetails(error: any): { message: string; s3Code?: string; status: number } {
  const s3Code = error.name || error.Code || error.$metadata?.httpStatusCode;
  const message = error.message || 'Operation failed';
  const status = error.$metadata?.httpStatusCode || 500;
  return { message, s3Code, status };
}

router.get('/:bucket', async (req: Request, res: Response) => {
  try {
    const { bucket } = req.params;
    if (!isValidBucketName(bucket)) {
      return res.status(400).json({ error: 'Invalid bucket name' });
    }

    const prefix = (req.query.prefix as string) || '';
    const { objects, prefixes } = await s3.listObjects(bucket, prefix);
    res.json({ objects, prefixes, bucket, prefix });
  } catch (error: any) {
    console.error('Error listing objects:', error);
    const { message, s3Code, status } = getS3ErrorDetails(error);
    res.status(status).json({ error: message, s3Code });
  }
});

router.get('/:bucket/download', async (req: Request, res: Response) => {
  try {
    const { bucket } = req.params;
    const key = req.query.key as string;

    if (!isValidBucketName(bucket)) {
      return res.status(400).json({ error: 'Invalid bucket name' });
    }
    if (!key || !isValidObjectKey(key)) {
      return res.status(400).json({ error: 'Invalid key' });
    }

    const url = await s3.getObjectUrl(bucket, key);
    res.json({ url });
  } catch (error: any) {
    console.error('Error getting download URL:', error);
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
    if (!key || !isValidObjectKey(key)) {
      return res.status(400).json({ error: 'Invalid key' });
    }

    // Get metadata for content type
    try {
      const metadata = await s3.getObjectMetadata(bucket, key);
      if (metadata.contentType) {
        res.setHeader('Content-Type', metadata.contentType);
      }
      if (metadata.contentLength) {
        res.setHeader('Content-Length', metadata.contentLength);
      }
    } catch (e) {
      // Ignore metadata errors, proceed with stream
      console.warn('Failed to get metadata for proxy:', e);
    }

    const stream = await s3.getObjectStream(bucket, key);
    // @ts-ignore - AWS SDK stream types are compatible with express response
    stream.pipe(res);
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
  try {
    const { bucket } = req.params;
    if (!isValidBucketName(bucket)) {
      return res.status(400).json({ error: 'Invalid bucket name' });
    }

    const prefix = (req.body.prefix as string) || '';
    const files = req.files as Express.Multer.File[];

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

      await s3.uploadObject(bucket, key, file.buffer, file.mimetype);
      results.push({ key, size: file.size });
    }

    res.json({ success: true, uploaded: results });
  } catch (error: any) {
    console.error('Error uploading files:', error);
    const { message, s3Code, status } = getS3ErrorDetails(error);
    res.status(status).json({ error: message, s3Code });
  }
});

router.post('/:bucket/folder', async (req: Request, res: Response) => {
  try {
    const { bucket } = req.params;
    const { path: folderPath } = req.body;

    if (!isValidBucketName(bucket)) {
      return res.status(400).json({ error: 'Invalid bucket name' });
    }
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
    if (!oldKey || !newKey || !isValidObjectKey(oldKey) || !isValidObjectKey(newKey)) {
      return res.status(400).json({ error: 'Invalid keys' });
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
    if (destBucket && !isValidBucketName(destBucket)) {
      return res.status(400).json({ error: 'Invalid destination bucket name' });
    }
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
