// v 1.0
/**
 * @fileoverview Express server entry point for Railway Bucket Explorer.
 * Sets up the Express application with middleware, routes, and static file serving.
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bucketsRouter from './routes/buckets.js';
import objectsRouter from './routes/objects.js';
import configRouter from './routes/config.js';

// Load environment variables from .env file
dotenv.config();

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create Express application
const app = express();
const PORT = process.env.PORT || 3001;

// ============================================================================
// MIDDLEWARE
// ============================================================================

// Enable CORS for all origins (needed for development with Vite proxy)
app.use(cors());

// Parse JSON request bodies
app.use(express.json());

// ============================================================================
// API ROUTES
// ============================================================================

// Mount bucket routes at /api/buckets
app.use('/api/buckets', bucketsRouter);

// Mount object routes at /api/objects
app.use('/api/objects', objectsRouter);

// Mount config routes at /api/config
app.use('/api/config', configRouter);

// Health check endpoint for Railway deployment
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================================================
// STATIC FILE SERVING (Production)
// ============================================================================

// In production, serve the built React app as static files
if (process.env.NODE_ENV === 'production') {
  const publicPath = path.join(__dirname, '..', 'public');

  // Serve static files from the public directory
  app.use(express.static(publicPath));

  // For any non-API route, serve index.html (SPA fallback)
  app.get('*', (req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
  });
}

// ============================================================================
// START SERVER
// ============================================================================

app.listen(PORT, () => {
  console.log(`Railway Bucket Explorer running on http://localhost:${PORT}`);
  console.log(`S3 Endpoint: ${process.env.S3_ENDPOINT || 'Not configured'}`);
});
