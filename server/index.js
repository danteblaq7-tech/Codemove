import express from 'express';
import cors from 'cors';
import { sb } from './supabase.js';
import { requireAuth } from './middleware.js';
import { staff } from './routes/staff.js';
import { content } from './routes/content.js';
import { learning } from './routes/learning.js';
import { me } from './routes/me.js';
import { authoring } from './routes/authoring.js'; // NEW: add courses/lessons + bulk student import
import { quizzes } from './routes/quizzes.js';     // NEW: quiz authoring (teacher/admin)
import { rankings } from './routes/rankings.js';   // NEW: graded rankings + student leaderboard

const app = express();
// CHANGED: CLIENT_ORIGIN may hold several addresses separated by commas (e.g. your site + a test address); trailing slashes are ignored.
const origins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',').map((o) => o.trim().replace(/\/+$/, ''));
app.use(cors({ origin: origins }));
// CHANGED: 100kb -> 1mb so a 1,000-row student list and long lesson HTML fit.
app.use(express.json({ limit: '1mb' }));
app.get('/health', (_q, r) => r.json({ ok: true }));
// NEW: also touches the database, so an uptime monitor pointed at this keeps a free Supabase project from pausing.
app.get('/health/db', async (_q, r) => {
  const { error } = await sb.from('courses').select('id').limit(1);
  r.status(error ? 500 : 200).json({ ok: !error });
});
app.use('/api', requireAuth, content, learning, me, staff, authoring, quizzes, rankings); // CHANGED: + quizzes, rankings

// NEW: always answer with JSON (the client calls r.json()), e.g. for oversized or malformed bodies.
app.use((err, _req, res, _next) => {
  const big = err.type === 'entity.too.large';
  res.status(big ? 413 : err.status || 500).json({ error: big ? 'That request is too large' : err.message });
});
// CHANGED: listen on all addresses and print the port (hosts such as Render / Railway / Enhance need this).
const PORT = process.env.PORT || 4000;
app.listen(PORT, '0.0.0.0', () => console.log(`CodeMove API ready on port ${PORT}`));
