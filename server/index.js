import express from 'express';
import cors from 'cors';
import { requireAuth } from './middleware.js';
import { staff } from './routes/staff.js';
import { content } from './routes/content.js';
import { learning } from './routes/learning.js';
import { me } from './routes/me.js';
import { authoring } from './routes/authoring.js'; // NEW: add courses/lessons + bulk student import

const app = express();
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
// CHANGED: 100kb -> 1mb so a 1,000-row student list and long lesson HTML fit.
app.use(express.json({ limit: '1mb' }));
app.get('/health', (_q, r) => r.json({ ok: true }));
app.use('/api', requireAuth, content, learning, me, staff, authoring); // CHANGED: + authoring

// NEW: always answer with JSON (the client calls r.json()), e.g. for oversized or malformed bodies.
app.use((err, _req, res, _next) => {
  const big = err.type === 'entity.too.large';
  res.status(big ? 413 : err.status || 500).json({ error: big ? 'That request is too large' : err.message });
});
app.listen(process.env.PORT || 4000, () => console.log('CodeMove API ready'));
