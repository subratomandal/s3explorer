import { Router, Request, Response } from 'express';
import { connections, ConnectionRecord } from '../services/db.js';
import { encryptAndPack, unpackAndDecrypt } from '../services/crypto.js';
import { listBuckets, S3ConnectionConfig } from '../services/s3.js';

const router = Router();

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
    const { name, endpoint, accessKey, secretKey, region, forcePathStyle } = req.body;

    if (!name || !endpoint || !accessKey || !secretKey) {
      res.status(400).json({ error: 'name, endpoint, accessKey, secretKey required' });
      return;
    }

    if (!connections.canCreate()) {
      res.status(400).json({ error: 'Maximum connections limit reached (100)' });
      return;
    }

    // Test connection first
    const config: S3ConnectionConfig = {
      endpoint,
      accessKey,
      secretKey,
      region: region || 'us-east-1',
      forcePathStyle: forcePathStyle ?? true,
    };

    try {
      await listBuckets(config);
    } catch (testErr: any) {
      // Connection test failed but we still save - user may fix credentials later
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`Connection test failed for '${name}':`, testErr.message);
      }
    }

    // Encrypt credentials
    const accessKeyEnc = encryptAndPack(accessKey);
    const secretKeyEnc = encryptAndPack(secretKey);

    const result = connections.create(
      name,
      endpoint,
      region || 'us-east-1',
      accessKeyEnc,
      secretKeyEnc,
      forcePathStyle ? 1 : 0
    );

    res.json({ success: true, id: result.lastInsertRowid });
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
    const id = parseInt(req.params.id);
    const { name, endpoint, accessKey, secretKey, region, forcePathStyle } = req.body;

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

    try {
      await listBuckets(config);
    } catch (testErr: any) {
      // Connection test failed but we still update - user may fix credentials later
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
      id
    );

    res.json({ success: true });
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
    const id = parseInt(req.params.id);
    const existing = connections.getById(id);

    if (!existing) {
      res.status(404).json({ error: 'Connection not found' });
      return;
    }

    connections.delete(id);
    res.json({ success: true });
  } catch (err: any) {
    console.error('Error deleting connection:', err);
    res.status(500).json({ error: 'Failed to delete connection' });
  }
});

// Set active connection
router.post('/:id/activate', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
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
    const { endpoint, accessKey, secretKey, region, forcePathStyle } = req.body;

    if (!endpoint || !accessKey || !secretKey) {
      res.status(400).json({ error: 'endpoint, accessKey, secretKey required' });
      return;
    }

    const config: S3ConnectionConfig = {
      endpoint,
      accessKey,
      secretKey,
      region: region || 'us-east-1',
      forcePathStyle: forcePathStyle ?? true,
    };

    const buckets = await listBuckets(config);
    res.json({ success: true, bucketCount: buckets.length });
  } catch (err: any) {
    res.status(400).json({ error: `Connection failed: ${err.message}` });
  }
});

export default router;
