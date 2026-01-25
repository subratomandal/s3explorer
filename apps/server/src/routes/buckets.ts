import { Router, Request, Response } from 'express';
import * as s3 from '../services/s3.js';

const router = Router();

// Validate bucket name
function isValidBucketName(name: string): boolean {
  return /^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(name) && !name.includes('..');
}

// Helper to extract S3 error details
function getS3ErrorDetails(error: any): { message: string; s3Code?: string; status: number } {
  const s3Code = error.name || error.Code || error.$metadata?.httpStatusCode;
  const message = error.message || 'Operation failed';
  const status = error.$metadata?.httpStatusCode || 500;
  return { message, s3Code, status };
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const buckets = await s3.listBuckets();
    res.json({ buckets });
  } catch (error: any) {
    console.warn('Error listing buckets:', error.message);
    // If no connection, return empty bucket list with special status
    if (error.message && error.message.includes('No active S3 connection')) {
      return res.json({ buckets: [] });
    }
    const { message, s3Code, status } = getS3ErrorDetails(error);
    res.status(status).json({ error: message, s3Code });
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
    const { message, s3Code, status } = getS3ErrorDetails(error);
    res.status(status).json({ error: message, s3Code });
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
    const { message, s3Code, status } = getS3ErrorDetails(error);
    res.status(status).json({ error: message, s3Code });
  }
});

export default router;
