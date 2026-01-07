import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import * as s3 from '../services/s3.js';

const router = Router();
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
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
    res.status(500).json({ error: 'Failed to list objects' });
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
    res.status(500).json({ error: 'Failed to get download URL' });
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
    res.status(500).json({ error: 'Failed to get metadata' });
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

    const results = [];
    for (const file of files) {
      const safeName = sanitizeFilename(file.originalname);
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
    res.status(500).json({ error: 'Failed to upload files' });
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
    res.status(500).json({ error: 'Failed to create folder' });
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
    res.status(500).json({ error: 'Failed to rename' });
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
    res.status(500).json({ error: 'Failed to copy' });
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
    res.status(500).json({ error: 'Failed to delete' });
  }
});

export default router;
