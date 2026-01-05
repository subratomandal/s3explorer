import { Router, Request, Response } from 'express';
import * as s3 from '../services/s3.js';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const buckets = await s3.listBuckets();
    res.json({ buckets });
  } catch (error: any) {
    console.error('Error listing buckets:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Bucket name is required' });
    }
    await s3.createBucket(name);
    res.json({ success: true, message: `Bucket '${name}' created` });
  } catch (error: any) {
    console.error('Error creating bucket:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:name', async (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    await s3.deleteBucket(name);
    res.json({ success: true, message: `Bucket '${name}' deleted` });
  } catch (error: any) {
    console.error('Error deleting bucket:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
