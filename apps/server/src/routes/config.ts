import { Router, Request, Response } from 'express';
import {
  setActiveConnection,
  getActiveConnection,
  listBuckets,
  type S3ConnectionConfig,
} from '../services/s3.js';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  const activeConn = getActiveConnection();

  if (activeConn) {
    res.json({
      endpoint: activeConn.endpoint,
      region: activeConn.region || 'us-east-1',
      forcePathStyle: activeConn.forcePathStyle ?? true,
      connected: true,
      source: 'dynamic',
    });
  } else {
    res.json({
      endpoint: process.env.S3_ENDPOINT || '',
      region: process.env.S3_REGION || 'us-east-1',
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
      connected: !!(process.env.S3_ACCESS_KEY && process.env.S3_SECRET_KEY),
      source: 'environment',
    });
  }
});

router.post('/connect', async (req: Request, res: Response) => {
  try {
    const { endpoint, accessKey, secretKey, region, forcePathStyle } = req.body;

    if (!endpoint || !accessKey || !secretKey) {
      return res.status(400).json({
        error: 'Missing required fields: endpoint, accessKey, secretKey',
      });
    }

    const config: S3ConnectionConfig = {
      endpoint,
      accessKey,
      secretKey,
      region: region || 'us-east-1',
      forcePathStyle: forcePathStyle ?? true,
    };

    setActiveConnection(config);

    try {
      await listBuckets();
      res.json({
        success: true,
        message: 'Connected successfully',
        endpoint: config.endpoint,
        region: config.region,
      });
    } catch (testError: any) {
      setActiveConnection(null);
      res.status(400).json({
        error: `Connection failed: ${testError.message}`,
      });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/disconnect', async (req: Request, res: Response) => {
  try {
    setActiveConnection(null);
    res.json({
      success: true,
      message: 'Reverted to environment configuration',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/test', async (req: Request, res: Response) => {
  try {
    const { endpoint, accessKey, secretKey, region, forcePathStyle } = req.body;

    if (!endpoint || !accessKey || !secretKey) {
      return res.status(400).json({
        error: 'Missing required fields: endpoint, accessKey, secretKey',
      });
    }

    const config: S3ConnectionConfig = {
      endpoint,
      accessKey,
      secretKey,
      region: region || 'us-east-1',
      forcePathStyle: forcePathStyle ?? true,
    };

    try {
      const buckets = await listBuckets(config);

      res.json({
        success: true,
        message: 'Connection test successful',
        bucketCount: buckets.length,
      });
    } catch (testError: any) {
      res.status(400).json({
        error: `Connection test failed: ${testError.message}`,
      });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/environments', async (req: Request, res: Response) => {
  res.json({
    info: 'Configure different environments using Railway environment variables or the Connection Manager UI',
    variables: [
      { name: 'S3_ENDPOINT', description: 'S3-compatible endpoint URL', required: true },
      { name: 'S3_ACCESS_KEY', description: 'Access key ID', required: true },
      { name: 'S3_SECRET_KEY', description: 'Secret access key', required: true },
      { name: 'S3_REGION', description: 'AWS region (default: us-east-1)', required: false },
      { name: 'S3_FORCE_PATH_STYLE', description: 'Use path-style URLs instead of virtual-hosted', required: false },
    ],
    dynamicConnection: {
      description: 'You can also switch connections at runtime using the Connection Manager in the UI',
      endpoints: {
        connect: 'POST /api/config/connect',
        disconnect: 'POST /api/config/disconnect',
        test: 'POST /api/config/test',
      },
    },
    railwayDocs: 'https://docs.railway.app/guides/volumes',
  });
});

export default router;
