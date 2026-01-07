import Database, { Database as DatabaseType, Statement } from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { EventEmitter } from 'events';
import session from 'express-session';

const DATA_DIR = process.env.DATA_DIR || '/data';
const DB_PATH = path.join(DATA_DIR, 's3explorer.db');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db: DatabaseType = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize schema
db.exec(`
  -- Sessions table for express-session
  CREATE TABLE IF NOT EXISTS sessions (
    sid TEXT PRIMARY KEY,
    sess TEXT NOT NULL,
    expired INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_sessions_expired ON sessions(expired);

  -- S3 Connections (encrypted credentials)
  CREATE TABLE IF NOT EXISTS connections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    endpoint TEXT NOT NULL,
    region TEXT DEFAULT 'us-east-1',
    access_key_enc TEXT NOT NULL,
    secret_key_enc TEXT NOT NULL,
    force_path_style INTEGER DEFAULT 1,
    is_active INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- Preferences
  CREATE TABLE IF NOT EXISTS preferences (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  -- Rate limiting
  CREATE TABLE IF NOT EXISTS rate_limits (
    ip TEXT PRIMARY KEY,
    attempts INTEGER DEFAULT 0,
    first_attempt INTEGER NOT NULL,
    blocked_until INTEGER
  );
`);

export default db;

// Session store for express-session (must extend Store)
export class SQLiteStore extends session.Store {
  private getStmt = db.prepare('SELECT sess FROM sessions WHERE sid = ? AND expired > ?');
  private setStmt = db.prepare('INSERT OR REPLACE INTO sessions (sid, sess, expired) VALUES (?, ?, ?)');
  private destroyStmt = db.prepare('DELETE FROM sessions WHERE sid = ?');
  private clearExpiredStmt = db.prepare('DELETE FROM sessions WHERE expired < ?');

  constructor() {
    super();
    // Emit connect event on next tick (required by express-session)
    process.nextTick(() => this.emit('connect'));
  }

  get(sid: string, callback: (err: any, session?: any) => void) {
    try {
      const row = this.getStmt.get(sid, Date.now()) as { sess: string } | undefined;
      if (row) {
        callback(null, JSON.parse(row.sess));
      } else {
        callback(null, null);
      }
    } catch (err) {
      callback(err);
    }
  }

  set(sid: string, session: any, callback?: (err?: any) => void) {
    try {
      const maxAge = session.cookie?.maxAge || 86400000; // 1 day default
      const expired = Date.now() + maxAge;
      this.setStmt.run(sid, JSON.stringify(session), expired);
      callback?.();
    } catch (err) {
      callback?.(err);
    }
  }

  destroy(sid: string, callback?: (err?: any) => void) {
    try {
      this.destroyStmt.run(sid);
      callback?.();
    } catch (err) {
      callback?.(err);
    }
  }

  clearExpired() {
    this.clearExpiredStmt.run(Date.now());
  }
}

// Connections CRUD
const MAX_CONNECTIONS = 100;

export interface ConnectionRecord {
  id: number;
  name: string;
  endpoint: string;
  region: string;
  access_key_enc: string;
  secret_key_enc: string;
  force_path_style: number;
  is_active: number;
  created_at: string;
}

const connGetAll = db.prepare('SELECT * FROM connections ORDER BY name');
const connGetById = db.prepare('SELECT * FROM connections WHERE id = ?');
const connGetActive = db.prepare('SELECT * FROM connections WHERE is_active = 1');
const connCreate = db.prepare(`
  INSERT INTO connections (name, endpoint, region, access_key_enc, secret_key_enc, force_path_style)
  VALUES (?, ?, ?, ?, ?, ?)
`);
const connUpdate = db.prepare(`
  UPDATE connections SET name = ?, endpoint = ?, region = ?, access_key_enc = ?, secret_key_enc = ?, force_path_style = ?
  WHERE id = ?
`);
const connDelete = db.prepare('DELETE FROM connections WHERE id = ?');
const connClearActive = db.prepare('UPDATE connections SET is_active = 0');
const connSetActiveById = db.prepare('UPDATE connections SET is_active = 1 WHERE id = ?');

export const connections = {
  getAll: () => connGetAll.all() as ConnectionRecord[],
  getById: (id: number) => connGetById.get(id) as ConnectionRecord | undefined,
  getActive: () => connGetActive.get() as ConnectionRecord | undefined,

  count: () => {
    const row = db.prepare('SELECT COUNT(*) as count FROM connections').get() as { count: number };
    return row.count;
  },

  create: (name: string, endpoint: string, region: string, accessKeyEnc: string, secretKeyEnc: string, forcePathStyle: number) => {
    return connCreate.run(name, endpoint, region, accessKeyEnc, secretKeyEnc, forcePathStyle);
  },

  update: (name: string, endpoint: string, region: string, accessKeyEnc: string, secretKeyEnc: string, forcePathStyle: number, id: number) => {
    return connUpdate.run(name, endpoint, region, accessKeyEnc, secretKeyEnc, forcePathStyle, id);
  },

  delete: (id: number) => connDelete.run(id),

  setActive: (id: number) => {
    db.transaction(() => {
      connClearActive.run();
      connSetActiveById.run(id);
    })();
  },

  clearActive: () => connClearActive.run(),

  canCreate: () => connections.count() < MAX_CONNECTIONS,
};

// Rate limiting
const rlGet = db.prepare('SELECT * FROM rate_limits WHERE ip = ?');
const rlUpsert = db.prepare(`
  INSERT INTO rate_limits (ip, attempts, first_attempt, blocked_until)
  VALUES (?, ?, ?, ?)
  ON CONFLICT(ip) DO UPDATE SET attempts = ?, first_attempt = ?, blocked_until = ?
`);
const rlReset = db.prepare('DELETE FROM rate_limits WHERE ip = ?');
const rlCleanup = db.prepare('DELETE FROM rate_limits WHERE blocked_until < ? OR first_attempt < ?');

export const rateLimits = {
  get: (ip: string) => rlGet.get(ip),
  upsert: (ip: string, attempts: number, firstAttempt: number, blockedUntil: number | null, a2: number, f2: number, b2: number | null) => {
    return rlUpsert.run(ip, attempts, firstAttempt, blockedUntil, a2, f2, b2);
  },
  reset: (ip: string) => rlReset.run(ip),
  cleanup: (time1: number, time2: number) => rlCleanup.run(time1, time2),
};

// Preferences
const prefSet = db.prepare('INSERT OR REPLACE INTO preferences (key, value) VALUES (?, ?)');
const prefDelete = db.prepare('DELETE FROM preferences WHERE key = ?');

export const preferences = {
  get: (key: string): string | null => {
    const row = db.prepare('SELECT value FROM preferences WHERE key = ?').get(key) as { value: string } | undefined;
    return row?.value ?? null;
  },
  set: (key: string, value: string) => prefSet.run(key, value),
  delete: (key: string) => prefDelete.run(key),
};

// Cleanup expired sessions periodically
setInterval(() => {
  const store = new SQLiteStore();
  store.clearExpired();
  // Also cleanup old rate limit entries (older than 24h)
  const dayAgo = Date.now() - 86400000;
  rateLimits.cleanup(Date.now(), dayAgo);
}, 3600000); // Every hour
