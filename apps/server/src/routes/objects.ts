import { Router, Request, Response } from 'express';
import multer from 'multer';
import * as s3 from '../services/s3.js';

const router = Router();

const upload = multer({ storage: multer.memoryStorage() });

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
