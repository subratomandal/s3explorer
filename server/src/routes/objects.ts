// v 1.0
/**
 * @fileoverview Express routes for S3 object operations.
 * Provides REST API endpoints for file/folder CRUD operations, uploads, and downloads.
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import * as s3 from '../services/s3.js';

const router = Router();

// Configure multer to store uploaded files in memory
const upload = multer({ storage: multer.memoryStorage() });

/**
 * GET /api/objects/:bucket
 * Lists objects (files and folders) in a bucket at the specified prefix.
 * 
 * @param bucket - Bucket name from URL path
 * @query prefix - Folder path to list (default: root)
 * @returns JSON with objects array, prefixes, bucket, and prefix
 */
router.get('/:bucket', async (req: Request, res: Response) => {
  try {
    const { bucket } = req.params;
    const prefix = (req.query.prefix as string) || '';
    const { objects, prefixes } = await s3.listObjects(bucket, prefix);
    res.json({ objects, prefixes, bucket, prefix });
  } catch (error: any) {
    console.error('Error listing objects:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/objects/:bucket/download
 * Gets a presigned URL for downloading a file.
 * 
 * @param bucket - Bucket name from URL path
 * @query key - Object key/path to download
 * @returns JSON with presigned 'url' string
 */
router.get('/:bucket/download', async (req: Request, res: Response) => {
  try {
    const { bucket } = req.params;
    const key = req.query.key as string;
    if (!key) {
      return res.status(400).json({ error: 'Key is required' });
    }
    const url = await s3.getObjectUrl(bucket, key);
    res.json({ url });
  } catch (error: any) {
    console.error('Error getting download URL:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/objects/:bucket/metadata
 * Gets metadata for an object without downloading it.
 * 
 * @param bucket - Bucket name from URL path
 * @query key - Object key/path
 * @returns JSON with contentType, contentLength, lastModified, metadata
 */
router.get('/:bucket/metadata', async (req: Request, res: Response) => {
  try {
    const { bucket } = req.params;
    const key = req.query.key as string;
    if (!key) {
      return res.status(400).json({ error: 'Key is required' });
    }
    const metadata = await s3.getObjectMetadata(bucket, key);
    res.json(metadata);
  } catch (error: any) {
    console.error('Error getting metadata:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/objects/:bucket/upload
 * Uploads one or more files to the bucket.
 * 
 * @param bucket - Bucket name from URL path
 * @body prefix - Folder path to upload into (form field)
 * @body files - Files to upload (multipart form field)
 * @returns JSON with success flag and uploaded files info
 */
router.post('/:bucket/upload', upload.array('files'), async (req: Request, res: Response) => {
  try {
    const { bucket } = req.params;
    const prefix = (req.body.prefix as string) || '';
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }

    const results = [];
    for (const file of files) {
      // Combine prefix with original filename
      const key = prefix ? `${prefix}${file.originalname}` : file.originalname;
      await s3.uploadObject(bucket, key, file.buffer, file.mimetype);
      results.push({ key, size: file.size });
    }

    res.json({ success: true, uploaded: results });
  } catch (error: any) {
    console.error('Error uploading files:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/objects/:bucket/folder
 * Creates a new empty folder.
 * 
 * @param bucket - Bucket name from URL path
 * @body {path: string} - Folder path to create
 * @returns JSON with success message
 */
router.post('/:bucket/folder', async (req: Request, res: Response) => {
  try {
    const { bucket } = req.params;
    const { path } = req.body;
    if (!path) {
      return res.status(400).json({ error: 'Path is required' });
    }
    await s3.createFolder(bucket, path);
    res.json({ success: true, message: `Folder '${path}' created` });
  } catch (error: any) {
    console.error('Error creating folder:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/objects/:bucket/rename
 * Renames/moves a file or folder.
 * 
 * @param bucket - Bucket name from URL path
 * @body {oldKey: string, newKey: string} - Current and new paths
 * @returns JSON with success message
 */
router.put('/:bucket/rename', async (req: Request, res: Response) => {
  try {
    const { bucket } = req.params;
    const { oldKey, newKey } = req.body;
    if (!oldKey || !newKey) {
      return res.status(400).json({ error: 'oldKey and newKey are required' });
    }
    await s3.renameObject(bucket, oldKey, newKey);
    res.json({ success: true, message: `Renamed '${oldKey}' to '${newKey}'` });
  } catch (error: any) {
    console.error('Error renaming object:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/objects/:bucket/copy
 * Copies an object to a new location.
 * 
 * @param bucket - Source bucket name from URL path
 * @body {sourceKey: string, destBucket?: string, destKey: string}
 * @returns JSON with success message
 */
router.post('/:bucket/copy', async (req: Request, res: Response) => {
  try {
    const { bucket } = req.params;
    const { sourceKey, destBucket, destKey } = req.body;
    if (!sourceKey || !destKey) {
      return res.status(400).json({ error: 'sourceKey and destKey are required' });
    }
    await s3.copyObject(bucket, sourceKey, destBucket || bucket, destKey);
    res.json({ success: true, message: `Copied '${sourceKey}' to '${destKey}'` });
  } catch (error: any) {
    console.error('Error copying object:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/objects/:bucket
 * Deletes a file or folder.
 * 
 * @param bucket - Bucket name from URL path
 * @query key - Object key/path to delete
 * @query isFolder - 'true' if deleting a folder (for recursive delete)
 * @returns JSON with success message
 */
router.delete('/:bucket', async (req: Request, res: Response) => {
  try {
    const { bucket } = req.params;
    const key = req.query.key as string;
    const isFolder = req.query.isFolder === 'true';

    if (!key) {
      return res.status(400).json({ error: 'Key is required' });
    }

    if (isFolder) {
      await s3.deleteFolder(bucket, key);
    } else {
      await s3.deleteObject(bucket, key);
    }

    res.json({ success: true, message: `Deleted '${key}'` });
  } catch (error: any) {
    console.error('Error deleting object:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
