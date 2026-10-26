import { Router } from 'express';
import { sb } from '../supabase.js';
import { h, requireRole } from '../middleware.js';
import { toEditable } from '../lib/lessonText.js';   // NEW
import { isOpen, makeCode } from '../lib/visibility.js';   // NEW
import { invalidateScores } from '../lib/scores.js';   // NEW: totals change when lessons are hidden/shown
export const staff = Router();
const ROLES = ['learner', 'teacher', 'admin'];
const teacher = requireRole('teacher', 'admin');
const admin = requireRole('admin');

// Teachers only reach their own classes; admins reach all.
async function ownClass(req, id) {
  let q = sb.from('classes').select('*').eq('id', id);
  if (req.role !== 'admin') q = q.eq('teacher_id', req.user.id);
  return (await q.maybeSingle()).data;
}

/* ---------- Teacher ---------- */
staff.get('/staff/classes', teacher, h(async (req, res) => {
  let q = sb.from('classes').select('id,name,class_members(count)').order('name');
  if (req.role !== 'admin') q = q.eq('teacher_id', req.user.id);
  const { data, error } = await q;
  if (error) throw error;
  res.json(data.map((c) => ({ id: c.id, name: c.name, learners: c.class_members[0]?.count ?? 0 })));
}));

staff.get('/staff/classes/:id/progress', teacher, h(async (req, res) => {
  const cls = await ownClass(req, req.params.id);
  if (!cls) return res.status(404).json({ error: 'Class not found' });
  const { data: mem } = await sb.from('class_members').select('users(id,full_name,email)').eq('class_id', cls.id);
  const learners = mem.map((m) => m.users), ids = learners.map((l) => l.id);
  // CHANGED: hidden lessons are left out of both the total and the completed counts.
  const { data: allL } = await sb.from('lessons').select('id,is_hidden,release_at,requires_code,access_code');
  const vis = (allL || []).filter((x) => isOpen(x));
  const total = vis.length, visIds = vis.map((x) => x.id);
  const { data: done } = ids.length
    ? await sb.from('user_progress').select('user_id').eq('status', 'completed').in('user_id', ids).in('lesson_id', visIds) : { data: [] };
  const n = {}; done.forEach((d) => (n[d.user_id] = (n[d.user_id] || 0) + 1));
  res.json({ class: cls, total, learners: learners.map((l) => ({ ...l, completed: n[l.id] || 0,
    percent: total ? Math.round(((n[l.id] || 0) / total) * 100) : 0 })) });
}));

staff.post('/staff/classes/:id/members', teacher, h(async (req, res) => {
  const cls = await ownClass(req, req.params.id);
  if (!cls) return res.status(404).json({ error: 'Class not found' });
  const { data: u } = await sb.from('users').select('id,role').eq('email', String(req.body.email || '').trim().toLowerCase()).maybeSingle();
  if (!u || u.role !== 'learner') return res.status(400).json({ error: 'No learner account with that email' });
  const { error } = await sb.from('class_members').upsert({ class_id: cls.id, user_id: u.id });
  if (error) throw error;
  res.json({ ok: true });
}));

staff.delete('/staff/classes/:id/members/:uid', teacher, h(async (req, res) => {
  if (!(await ownClass(req, req.params.id))) return res.status(404).json({ error: 'Class not found' });
  await sb.from('class_members').delete().eq('class_id', req.params.id).eq('user_id', req.params.uid);
  res.json({ ok: true });
}));

// CHANGED: lesson notes are sent to the editor as PLAIN TEXT (old HTML lessons are converted on the fly).
staff.get('/staff/lessons', teacher, h(async (_req, res) => {
  const { data, error } = await sb.from('lessons')
    .select('id,title,content,code_example,tip_text,order_index,is_hidden,release_at,requires_code,access_code,code_expires_at,module_id,modules(title,course_id,courses(title))').order('order_index');   // CHANGED: + is_hidden, module_id
  if (error) throw error;
  res.json(data.map((l) => ({ ...l, content: toEditable(l.content) })));
}));

staff.patch('/staff/lessons/:id', teacher, h(async (req, res) => {
  const p = {};
  for (const k of ['title', 'content', 'code_example', 'tip_text']) if (typeof req.body[k] === 'string') p[k] = req.body[k];
  // NEW: hide / release / schedule one lesson. Hiding or "release now" clears any schedule.
  if (typeof req.body.is_hidden === 'boolean') { p.is_hidden = req.body.is_hidden; p.release_at = null; }
  if (req.body.release_at === null) p.release_at = null;
  else if (req.body.release_at !== undefined) {
    const d = new Date(req.body.release_at);
    if (typeof req.body.release_at !== 'string' || Number.isNaN(d.getTime())) return res.status(400).json({ error: 'That date is not valid' });
    p.release_at = d.toISOString(); p.is_hidden = false;      // a schedule means "open at this time"
  }
  if (!Object.keys(p).length) return res.status(400).json({ error: 'Nothing to update' });
  const { error } = await sb.from('lessons').update(p).eq('id', req.params.id);
  if (error) throw error;
  if ('is_hidden' in p || 'release_at' in p) invalidateScores();
  res.json({ ok: true });
}));

// NEW: hide or release every lesson in a module at once (e.g. hide all, then release them one by one).
staff.post('/staff/modules/:id/visibility', teacher, h(async (req, res) => {
  if (typeof req.body.hidden !== 'boolean') return res.status(400).json({ error: 'hidden must be true or false' });
  const { error } = await sb.from('lessons').update({ is_hidden: req.body.hidden, release_at: null }).eq('module_id', req.params.id);
  if (error) throw error;
  invalidateScores();
  res.json({ ok: true });
}));

// NEW: "drip" a module – first lesson opens at `start`, then one more every `every_days` days, in lesson order.
staff.post('/staff/modules/:id/schedule', teacher, h(async (req, res) => {
  const start = new Date(req.body.start), every = Number(req.body.every_days);
  if (Number.isNaN(start.getTime())) return res.status(400).json({ error: 'Pick a valid start date and time' });
  if (!Number.isFinite(every) || every < 0 || every > 365) return res.status(400).json({ error: 'Days between lessons must be 0–365' });
  const { data: ls, error } = await sb.from('lessons').select('id,order_index').eq('module_id', req.params.id).order('order_index');
  if (error) throw error;
  if (!ls.length) return res.status(404).json({ error: 'No lessons in that module' });
  await Promise.all(ls.map(async (l, k) => {
    const at = new Date(start.getTime() + k * every * 86_400_000).toISOString();
    const { error: e } = await sb.from('lessons').update({ is_hidden: false, release_at: at }).eq('id', l.id);
    if (e) throw e;
  }));
  invalidateScores();
  res.json({ ok: true, lessons: ls.length });
}));

// NEW: ---- class codes ----
// action 'issue' = give the lesson a fresh code (learners type it to open the lesson); optional `minutes` = how long NEW entries are allowed
//        'lock'  = lock it again: no code, and everyone who had unlocked it is locked out too
//        'open'  = remove the code requirement; the lesson is open to everyone
// For a whole module / course, 'issue' only gives a code to lessons that don't have one yet (so codes you already read out stay valid).
async function applyGate(ids, action, minutes, { onlyMissing = false } = {}) {
  if (!ids.length) return 0;
  if (action === 'issue') {
    const { data: rows } = await sb.from('lessons').select('id,access_code,requires_code').in('id', ids);
    const { data: used } = await sb.from('lessons').select('access_code').not('access_code', 'is', null);
    const taken = new Set((used || []).map((x) => x.access_code));
    const exp = minutes > 0 ? new Date(Date.now() + minutes * 60_000).toISOString() : null;
    const todo = (rows || []).filter((r) => !(onlyMissing && r.requires_code && r.access_code));
    await Promise.all(todo.map(async (r) => {
      const { error } = await sb.from('lessons').update({ requires_code: true, access_code: makeCode(taken), code_expires_at: exp }).eq('id', r.id);
      if (error) throw error;
    }));
    return todo.length;
  }
  const patch = action === 'lock'
    ? { requires_code: true, access_code: null, code_expires_at: null }
    : { requires_code: false, access_code: null, code_expires_at: null };
  const { error } = await sb.from('lessons').update(patch).in('id', ids);
  if (error) throw error;
  await sb.from('lesson_unlocks').delete().in('lesson_id', ids);     // locking again / opening up resets who had unlocked it
  return ids.length;
}
const gateBody = (req, res) => {
  const action = req.body.action, minutes = Math.min(1440, Math.max(0, Math.floor(Number(req.body.minutes) || 0)));
  if (!['issue', 'lock', 'open'].includes(action)) { res.status(400).json({ error: 'action must be issue, lock or open' }); return null; }
  return { action, minutes };
};
staff.post('/staff/lessons/:id/gate', teacher, h(async (req, res) => {
  const g = gateBody(req, res); if (!g) return;
  const n = await applyGate([req.params.id], g.action, g.minutes);
  invalidateScores(); res.json({ ok: true, lessons: n });
}));
staff.post('/staff/modules/:id/gate', teacher, h(async (req, res) => {
  const g = gateBody(req, res); if (!g) return;
  const { data } = await sb.from('lessons').select('id').eq('module_id', req.params.id);
  const n = await applyGate((data || []).map((x) => x.id), g.action, g.minutes, { onlyMissing: true });
  invalidateScores(); res.json({ ok: true, lessons: n });
}));
staff.post('/staff/courses/:id/gate', teacher, h(async (req, res) => {
  const g = gateBody(req, res); if (!g) return;
  const { data } = await sb.from('lessons').select('id, modules!inner(course_id)').eq('modules.course_id', req.params.id);
  const n = await applyGate((data || []).map((x) => x.id), g.action, g.minutes, { onlyMissing: true });
  invalidateScores(); res.json({ ok: true, lessons: n });
}));

/* ---------- Admin ---------- */
staff.get('/admin/users', admin, h(async (_req, res) => {
  const { data, error } = await sb.from('users').select('id,full_name,email,role,is_active,created_at').order('created_at', { ascending: false });
  if (error) throw error;
  res.json(data);
}));

staff.post('/admin/users', admin, h(async (req, res) => {
  const { full_name, email, password, role } = req.body;
  if (!full_name || !email || !ROLES.includes(role) || String(password || '').length < 8)
    return res.status(400).json({ error: 'Name, email, role and an 8+ character password are required' });
  const { data, error } = await sb.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name } });
  if (error) return res.status(400).json({ error: error.message });
  await sb.from('users').update({ role }).eq('id', data.user.id); // profile row is created by the DB trigger
  res.json({ id: data.user.id });
}));

staff.patch('/admin/users/:id', admin, h(async (req, res) => {
  const { role, is_active } = req.body, p = {};
  if (ROLES.includes(role)) p.role = role;
  if (typeof is_active === 'boolean') p.is_active = is_active;
  if (req.params.id === req.user.id && ((p.role && p.role !== 'admin') || p.is_active === false))
    return res.status(400).json({ error: "You can't demote or disable your own account" });
  const { error } = await sb.from('users').update(p).eq('id', req.params.id);
  if (error) throw error;
  if ('is_active' in p) await sb.auth.admin.updateUserById(req.params.id, { ban_duration: p.is_active ? 'none' : '876000h' });
  res.json({ ok: true });
}));

staff.post('/admin/users/:id/reset-password', admin, h(async (req, res) => {
  if (String(req.body.password || '').length < 8) return res.status(400).json({ error: 'Password needs 8+ characters' });
  const { error } = await sb.auth.admin.updateUserById(req.params.id, { password: req.body.password });
  if (error) return res.status(400).json({ error: error.message });
  res.json({ ok: true });
}));

staff.get('/admin/classes', admin, h(async (_req, res) => {
  const { data, error } = await sb.from('classes').select('id,name,teacher_id,class_members(count)').order('name');
  if (error) throw error;
  res.json(data.map((c) => ({ id: c.id, name: c.name, teacher_id: c.teacher_id, learners: c.class_members[0]?.count ?? 0 })));
}));
staff.post('/admin/classes', admin, h(async (req, res) => {
  if (!String(req.body.name || '').trim()) return res.status(400).json({ error: 'Class name is required' });
  const { error } = await sb.from('classes').insert({ name: req.body.name.trim(), teacher_id: req.body.teacher_id || null });
  if (error) throw error;
  res.json({ ok: true });
}));
staff.patch('/admin/classes/:id', admin, h(async (req, res) => {
  const { error } = await sb.from('classes').update({ teacher_id: req.body.teacher_id || null }).eq('id', req.params.id);
  if (error) throw error;
  res.json({ ok: true });
}));

staff.get('/admin/courses', admin, h(async (_req, res) => {
  const { data, error } = await sb.from('courses').select('id,title,is_published,modules(lessons(id))').order('created_at');
  if (error) throw error;
  res.json(data.map((c) => ({ id: c.id, title: c.title, is_published: c.is_published, lessons: c.modules.reduce((n, m) => n + m.lessons.length, 0) })));
}));
staff.patch('/admin/courses/:id', admin, h(async (req, res) => {
  const { error } = await sb.from('courses').update({ is_published: !!req.body.is_published }).eq('id', req.params.id);
  if (error) throw error;
  res.json({ ok: true });
}));
