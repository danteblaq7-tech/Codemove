import express from 'express';
import cors from 'cors';
import { requireAuth } from './middleware.js';
import { staff } from './routes/staff.js';
import { content } from './routes/content.js';
import { learning } from './routes/learning.js';
import { me } from './routes/me.js';

const app = express();
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '100kb' }));
app.get('/health', (_q, r) => r.json({ ok: true }));
app.use('/api', requireAuth, content, learning, me, staff);
app.listen(process.env.PORT || 4000, () => console.log('CodeMove API ready'));
