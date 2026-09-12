import { Router, Request, Response } from 'express';
import { connections, ConnectionRecord } from '../services/db.js';
import { encryptAndPack, unpackAndDecrypt } from '../services/crypto.js';
import { listBuckets, testBucketAccess, S3ConnectionConfig } from '../services/s3.js';
import { isValidBucketName, isValidRegion } from '../utils/validation.js';

const router = Router();

const INVALID_REGION_MSG = 'Invalid region. Use letters, numbers, dots, and hyphens (max 64 chars).';

// Free-text region from the UI (custom providers like Garage). Empty means "use the default".
function parseRegion(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

// Get all connections (without decrypted creds)
router.get('/', (req: Request, res: Response) => {
  try {
    const rows = connections.getAll();
    const sanitized = rows.map(row => ({
      id: row.id,
      name: row.name,
      endpoint: row.endpoint,
      region: row.region,
      forcePathStyle: !!row.force_path_style,
      isActive: !!row.is_active,
      createdAt: row.created_at,
      bucket: row.bucket || null,
    }));
    res.json({ connections: sanitized });
  } catch (err: any) {
    console.error('Error listing connections:', err);
    res.status(500).json({ error: 'Failed to list connections' });
  }
});

// Get active connection info
router.get('/active', (req: Request, res: Response) => {
  try {
    const row = connections.getActive();
    if (!row) {
      res.json({ active: null });
      return;
    }
    res.json({
      active: {
        id: row.id,
        name: row.name,
        endpoint: row.endpoint,
        region: row.region,
        forcePathStyle: !!row.force_path_style,
        bucket: row.bucket || null,
      },
    });
  } catch (err: any) {
    console.error('Error getting active connection:', err);
    res.status(500).json({ error: 'Failed to get active connection' });
  }
});

// Create new connection
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, endpoint, accessKey, secretKey, forcePathStyle } = req.body;
    const region = parseRegion(req.body.region);
    const bucket = req.body.bucket?.trim() || null;

    if (!name?.trim() || !endpoint?.trim() || !accessKey?.trim() || !secretKey?.trim()) {
      res.status(400).json({ error: 'name, endpoint, accessKey, secretKey required and cannot be empty' });
      return;
    }

    if (bucket && !isValidBucketName(bucket)) {
      res.status(400).json({ error: 'Invalid bucket name. Use 3–63 lowercase letters, numbers, dots, and hyphens.' });
      return;
    }

    if (region && !isValidRegion(region)) {
      res.status(400).json({ error: INVALID_REGION_MSG });
      return;
    }

    if (!connections.canCreate()) {
      res.status(400).json({ error: 'Maximum connections limit reached (100)' });
      return;
    }

    // Test the connection before persisting so we can warn the user about bad creds
    // upfront. We still save on failure (testPassed=false) -- the user might be
    // configuring ahead of time before the S3 endpoint is ready.
    const config: S3ConnectionConfig = {
      endpoint,
      accessKey,
      secretKey,
      region: region || 'us-east-1',
      forcePathStyle: forcePathStyle ?? true,
    };

    let testPassed = false;
    let testError: string | undefined;
    try {
      if (bucket) {
        await testBucketAccess(config, bucket);
      } else {
        await listBuckets(config);
      }
      testPassed = true;
    } catch (testErr: any) {
      testError = testErr.message || 'Connection test failed';
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`Connection test failed for '${name}':`, testErr.message);
      }
    }

    // Credentials are AES-256-GCM encrypted before touching the DB -- even if the
    // SQLite file is exfiltrated, keys are useless without the encryption.key file.
    const accessKeyEnc = encryptAndPack(accessKey);
    const secretKeyEnc = encryptAndPack(secretKey);

    const result = connections.create(
      name,
      endpoint,
      region || 'us-east-1',
      accessKeyEnc,
      secretKeyEnc,
      forcePathStyle ? 1 : 0,
      bucket
    );

    res.json({ success: true, id: result.lastInsertRowid, testPassed, testError });
  } catch (err: any) {
    if (err.message?.includes('UNIQUE constraint')) {
      res.status(400).json({ error: 'Connection name already exists' });
      return;
    }
    console.error('Error creating connection:', err);
    res.status(500).json({ error: 'Failed to create connection' });
  }
});

// Update connection
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { name, endpoint, accessKey, secretKey, forcePathStyle } = req.body;
    const region = parseRegion(req.body.region);
    const bucket = req.body.bucket !== undefined ? (req.body.bucket?.trim() || null) : undefined;

    if (bucket && !isValidBucketName(bucket)) {
      res.status(400).json({ error: 'Invalid bucket name. Use 3–63 lowercase letters, numbers, dots, and hyphens.' });
      return;
    }

    if (region && !isValidRegion(region)) {
      res.status(400).json({ error: INVALID_REGION_MSG });
      return;
    }

    const existing = connections.getById(id);
    if (!existing) {
      res.status(404).json({ error: 'Connection not found' });
      return;
    }

    // Use existing creds if not provided
    const finalAccessKey = accessKey || unpackAndDecrypt(existing.access_key_enc);
    const finalSecretKey = secretKey || unpackAndDecrypt(existing.secret_key_enc);

    // Test connection
    const config: S3ConnectionConfig = {
      endpoint: endpoint || existing.endpoint,
      accessKey: finalAccessKey,
      secretKey: finalSecretKey,
      region: region || existing.region,
      forcePathStyle: forcePathStyle ?? !!existing.force_path_style,
    };

    let testPassed = false;
    let testError: string | undefined;
    try {
      const testBucket = bucket !== undefined ? bucket : existing.bucket;
      if (testBucket) {
        await testBucketAccess(config, testBucket);
      } else {
        await listBuckets(config);
      }
      testPassed = true;
    } catch (testErr: any) {
      testError = testErr.message || 'Connection test failed';
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`Connection test failed for '${name || existing.name}':`, testErr.message);
      }
    }

    // Encrypt credentials
    const accessKeyEnc = encryptAndPack(finalAccessKey);
    const secretKeyEnc = encryptAndPack(finalSecretKey);

    connections.update(
      name || existing.name,
      endpoint || existing.endpoint,
      region || existing.region,
      accessKeyEnc,
      secretKeyEnc,
      (forcePathStyle ?? !!existing.force_path_style) ? 1 : 0,
      bucket !== undefined ? bucket : existing.bucket,
      id
    );

    res.json({ success: true, testPassed, testError });
  } catch (err: any) {
    if (err.message?.includes('UNIQUE constraint')) {
      res.status(400).json({ error: 'Connection name already exists' });
      return;
    }
    console.error('Error updating connection:', err);
    res.status(500).json({ error: 'Failed to update connection' });
  }
});

// Delete connection
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = connections.getById(id);

    if (!existing) {
      res.status(404).json({ error: 'Connection not found' });
      return;
    }

    // If deleting the active connection, clear active state first
    if (existing.is_active) {
      connections.clearActive();
    }

    connections.delete(id);
    res.json({ success: true, wasActive: !!existing.is_active });
  } catch (err: any) {
    console.error('Error deleting connection:', err);
    res.status(500).json({ error: 'Failed to delete connection' });
  }
});

// Set active connection
router.post('/:id/activate', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = connections.getById(id);

    if (!existing) {
      res.status(404).json({ error: 'Connection not found' });
      return;
    }

    connections.setActive(id);
    res.json({ success: true });
  } catch (err: any) {
    console.error('Error activating connection:', err);
    res.status(500).json({ error: 'Failed to activate connection' });
  }
});

// Disconnect (clear active)
router.post('/disconnect', (req: Request, res: Response) => {
  try {
    connections.clearActive();
    res.json({ success: true });
  } catch (err: any) {
    console.error('Error disconnecting:', err);
    res.status(500).json({ error: 'Failed to disconnect' });
  }
});

// Test connection without saving
router.post('/test', async (req: Request, res: Response) => {
  try {
    const { endpoint, accessKey, secretKey, forcePathStyle } = req.body;
    const region = parseRegion(req.body.region);
    const bucket = req.body.bucket?.trim() || null;

    if (!endpoint || !accessKey || !secretKey) {
      res.status(400).json({ error: 'endpoint, accessKey, secretKey required' });
      return;
    }

    if (bucket && !isValidBucketName(bucket)) {
      res.status(400).json({ error: 'Invalid bucket name. Use 3–63 lowercase letters, numbers, dots, and hyphens.' });
      return;
    }

    if (region && !isValidRegion(region)) {
      res.status(400).json({ error: INVALID_REGION_MSG });
      return;
    }

    const config: S3ConnectionConfig = {
      endpoint,
      accessKey,
      secretKey,
      region: region || 'us-east-1',
      forcePathStyle: forcePathStyle ?? true,
    };

    if (bucket) {
      await testBucketAccess(config, bucket);
      res.json({ success: true, bucketCount: 1 });
    } else {
      const buckets = await listBuckets(config);
      res.json({ success: true, bucketCount: buckets.length });
    }
  } catch (err: any) {
    res.status(400).json({ error: `Connection failed: ${err.message}` });
  }
});

export default router;
