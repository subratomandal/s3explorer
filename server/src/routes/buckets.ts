/**
 * @fileoverview Express routes for S3 bucket operations.
 * Provides REST API endpoints for listing, creating, and deleting buckets.
 */

import { Router, Request, Response } from 'express';
import * as s3 from '../services/s3.js';

const router = Router();

/**
 * GET /api/buckets
 * Lists all available S3 buckets.
 * 
 * @returns JSON object with 'buckets' array
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const buckets = await s3.listBuckets();
    res.json({ buckets });
  } catch (error: any) {
    console.error('Error listing buckets:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/buckets
 * Creates a new S3 bucket.
 * 
 * @body {name: string} - The bucket name (must be DNS-compliant)
 * @returns JSON with success message
 */
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

/**
 * DELETE /api/buckets/:name
 * Deletes an S3 bucket. The bucket must be empty.
 * 
 * @param name - Bucket name from URL path
 * @returns JSON with success message
 */
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
