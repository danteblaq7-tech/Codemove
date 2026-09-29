import { Router } from 'express';
import { sb } from '../supabase.js';
import { h } from '../middleware.js';
export const me = Router();
const cnt = (t, uid, extra = {}) => sb.from(t).select('*', { count: 'exact', head: true }).eq('user_id', uid).match(extra);

me.get('/me', h(async (req, res) => {
  const uid = req.user.id;
  const { data: profile } = await sb.from('users').select('*').eq('id', uid).single();
  const [lessons, badges, att] = await Promise.all([
    cnt('user_progress', uid, { status: 'completed' }), cnt('user_badges', uid, { status: 'completed' }),
    sb.from('quiz_attempts').select('score').eq('user_id', uid)]);
  const s = att.data || [];
  res.json({ ...profile, stats: { lessons: lessons.count || 0, badges: badges.count || 0,
    avgScore: s.length ? Math.round(s.reduce((a, x) => a + x.score, 0) / s.length) : 0 } });
}));

me.patch('/me', h(async (req, res) => {
  const patch = { updated_at: new Date().toISOString() };
  if (['light', 'dark'].includes(req.body.theme_preference)) patch.theme_preference = req.body.theme_preference;
  if (typeof req.body.full_name === 'string' && req.body.full_name.trim()) patch.full_name = req.body.full_name.trim();
  const { error } = await sb.from('users').update(patch).eq('id', req.user.id);
  if (error) throw error;
  res.json({ ok: true });
}));

me.get('/badges', h(async (req, res) => {
  const [{ data: badges }, { data: mine }] = await Promise.all([sb.from('badges').select('*').order('created_at'),
    sb.from('user_badges').select('*').eq('user_id', req.user.id)]);
  const m = Object.fromEntries((mine || []).map((b) => [b.badge_id, b]));
  res.json(badges.map((b) => ({ ...b, status: m[b.id]?.status || 'locked', earned_at: m[b.id]?.earned_at || null })));
}));

me.get('/notifications', h(async (req, res) => {
  const { data } = await sb.from('notifications').select('*').eq('user_id', req.user.id).order('created_at', { ascending: false }).limit(20);
  res.json(data || []);
}));
me.patch('/notifications/:id/read', h(async (req, res) => {
  await sb.from('notifications').update({ is_read: true }).eq('id', req.params.id).eq('user_id', req.user.id);
  res.json({ ok: true });
}));
