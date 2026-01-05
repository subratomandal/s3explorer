import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bucketsRouter from './routes/buckets.js';
import objectsRouter from './routes/objects.js';
import configRouter from './routes/config.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/buckets', bucketsRouter);
app.use('/api/objects', objectsRouter);
app.use('/api/config', configRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

if (process.env.NODE_ENV === 'production') {
  const publicPath = path.join(__dirname, '..', 'public');
  app.use(express.static(publicPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Railway Bucket Explorer running on http://localhost:${PORT}`);
  console.log(`S3 Endpoint: ${process.env.S3_ENDPOINT || 'Not configured'}`);
});
