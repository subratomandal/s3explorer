import { Router, Request, Response } from 'express';
import * as s3 from '../services/s3.js';

const router = Router();

// Validate bucket name
function isValidBucketName(name: string): boolean {
  return /^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(name) && !name.includes('..');
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const buckets = await s3.listBuckets();
    res.json({ buckets });
  } catch (error: any) {
    console.error('Error listing buckets:', error);
    res.status(500).json({ error: 'Failed to list buckets' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Bucket name required' });
    }
    if (!isValidBucketName(name)) {
      return res.status(400).json({ error: 'Invalid bucket name. Use lowercase letters, numbers, and hyphens.' });
    }
    
    await s3.createBucket(name);
    res.json({ success: true, message: 'Bucket created' });
  } catch (error: any) {
    console.error('Error creating bucket:', error);
    res.status(500).json({ error: 'Failed to create bucket' });
  }
});

router.delete('/:name', async (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    if (!isValidBucketName(name)) {
      return res.status(400).json({ error: 'Invalid bucket name' });
    }
    
    await s3.deleteBucket(name);
    res.json({ success: true, message: 'Bucket deleted' });
  } catch (error: any) {
    console.error('Error deleting bucket:', error);
    res.status(500).json({ error: 'Failed to delete bucket' });
  }
});

export default router;
