import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import helmet from 'helmet';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

import { SQLiteStore } from './services/db.js';
import { requireAuth } from './middleware/auth.js';
import authRouter from './routes/auth.js';
import bucketsRouter from './routes/buckets.js';
import objectsRouter from './routes/objects.js';
import connectionsRouter from './routes/connections.js';
import setupRouter from './routes/setup.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://fonts.gstatic.com"],
      fontSrc: ["'self'", "https://fonts.googleapis.com", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],
    },
  },
}));

// Trust proxy (Railway/load balancers)
app.set('trust proxy', 1);

// Body parsing
app.use(express.json());

// Global error logging for debugging
app.use((req, res, next) => {
  const originalJson = res.json;
  // @ts-ignore
  res.json = function (body) {
    if (res.statusCode >= 500) {
      console.error(`[${req.method}] ${req.url} returned ${res.statusCode}:`, body);
    }
    return originalJson.call(this, body);
  };
  next();
});

// Session configuration
const sessionSecret = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
if (!process.env.SESSION_SECRET) {
  console.warn('WARNING: SESSION_SECRET not set, using random secret. Sessions will invalidate on restart.');
}

app.use(session({
  name: 'sid',
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  store: new SQLiteStore() as any,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000, // 1 day default
  },
}));

// Auth routes (no auth required)
app.use('/api/auth', authRouter);
app.use('/api/setup', setupRouter);


// Health check (no auth required)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Protected API routes
app.use('/api/buckets', requireAuth, bucketsRouter);
app.use('/api/objects', requireAuth, objectsRouter);
app.use('/api/connections', requireAuth, connectionsRouter);

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled Server Error:', err);
  if (!res.headersSent) {
    // Don't expose error details in production
    const message = process.env.NODE_ENV === 'production'
      ? 'Internal Server Error'
      : err.message;
    res.status(500).json({ error: message });
  }
});

// Serve static files if they exist (Production / Docker)
const publicPath = path.join(__dirname, '..', 'public');

if (fs.existsSync(publicPath)) {
  console.log(`Serving static files from: ${publicPath}`);
  app.use(express.static(publicPath));

  // SPA catch-all
  app.get('*', (req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
  });
} else {
  console.log(`Static files not found at ${publicPath} (Running in API-only/Dev mode)`);
}

app.listen(PORT, () => {
  console.log(`S3 Explorer running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
