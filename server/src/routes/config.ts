// v 1.0
/**
 * @fileoverview Express routes for S3 configuration information.
 * Provides endpoints to check connection status and get configuration help.
 */

import { Router, Request, Response } from 'express';

const router = Router();

/**
 * GET /api/config
 * Returns the current S3 configuration (sanitized - no secrets).
 * Useful for debugging and displaying connection status in the UI.
 * 
 * @returns JSON with endpoint, region, forcePathStyle, and connected status
 */
router.get('/', async (req: Request, res: Response) => {
  res.json({
    endpoint: process.env.S3_ENDPOINT || '',
    region: process.env.S3_REGION || 'us-east-1',
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
    connected: !!(process.env.S3_ACCESS_KEY && process.env.S3_SECRET_KEY),
  });
});

/**
 * GET /api/config/environments
 * Returns information about how to configure the application.
 * Lists all required and optional environment variables.
 * 
 * @returns JSON with configuration documentation
 */
router.get('/environments', async (req: Request, res: Response) => {
  res.json({
    info: 'Configure different environments using Railway environment variables',
    variables: [
      { name: 'S3_ENDPOINT', description: 'S3-compatible endpoint URL' },
      { name: 'S3_ACCESS_KEY', description: 'Access key ID' },
      { name: 'S3_SECRET_KEY', description: 'Secret access key' },
      { name: 'S3_REGION', description: 'AWS region (default: us-east-1)' },
      { name: 'S3_FORCE_PATH_STYLE', description: 'Use path-style URLs instead of virtual-hosted' },
    ],
    railwayDocs: 'https://docs.railway.app/guides/volumes',
  });
});

export default router;
