import express from 'express';
import cors from 'cors';
import { requireAuth } from './middleware.js';
import { staff } from './routes/staff.js';
import { content } from './routes/content.js';
import { learning } from './routes/learning.js';
import { me } from './routes/me.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { authoring } from './routes/authoring.js'; // NEW: add courses/lessons + bulk student import
import { quizzes } from './routes/quizzes.js';     // NEW: quiz authoring (teacher/admin)
import { rankings } from './routes/rankings.js';   // NEW: graded rankings + student leaderboard

const app = express();
const clientOrigin = (process.env.CLIENT_ORIGIN || 'https://codemove.kirigimary2.workers.dev').trim().replace(/\/+$/, '');
app.use(cors({ origin: clientOrigin }));
const publicDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'public');
app.use(express.static(publicDir));
app.use((req, res, next) => {
  if (req.method !== 'GET' || req.path.startsWith('/api') || req.path === '/health') return next();
  res.sendFile(path.join(publicDir, 'index.html'));
});
// CHANGED: 100kb -> 1mb so a 1,000-row student list and long lesson HTML fit.
app.use(express.json({ limit: '1mb' }));
app.get('/health', (_q, r) => r.json({ ok: true }));
app.use('/api', requireAuth, content, learning, me, staff, authoring, quizzes, rankings); // CHANGED: + quizzes, rankings

// NEW: always answer with JSON (the client calls r.json()), e.g. for oversized or malformed bodies.
app.use((err, _req, res, _next) => {
  const big = err.type === 'entity.too.large';
  res.status(big ? 413 : err.status || 500).json({ error: big ? 'That request is too large' : err.message });
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`CodeMove API ready on port ${PORT}`));
