import { Router } from 'express';
import { sb } from '../supabase.js';
import { h, requireRole } from '../middleware.js';
import { toEditable } from '../lib/lessonText.js';   // NEW
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
  const { count: total } = await sb.from('lessons').select('*', { count: 'exact', head: true });
  const { data: done } = ids.length
    ? await sb.from('user_progress').select('user_id').eq('status', 'completed').in('user_id', ids) : { data: [] };
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
    .select('id,title,content,code_example,tip_text,order_index,modules(title,courses(title))').order('order_index');
  if (error) throw error;
  res.json(data.map((l) => ({ ...l, content: toEditable(l.content) })));
}));

staff.patch('/staff/lessons/:id', teacher, h(async (req, res) => {
  const p = {};
  for (const k of ['title', 'content', 'code_example', 'tip_text']) if (typeof req.body[k] === 'string') p[k] = req.body[k];
  const { error } = await sb.from('lessons').update(p).eq('id', req.params.id);
  if (error) throw error;
  res.json({ ok: true });
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
/* ---------- NEW: delete courses and lessons (admin only, permanent) ---------- */
// Your database cascades: deleting a course also deletes its modules, lessons, quizzes, questions and
// EVERY student's progress, saved code and quiz attempts for it. Deleting a lesson removes that lesson's
// progress and saved code. That is why these routes are admin-only, and the course route needs the title typed.
// (If you might want the course back, use "Hide" instead; it keeps everything.)

// Record who deleted what (table comes from supabase/manage.sql; if it is missing this silently does nothing).
const logDelete = (actor, action, details) =>
  sb.from('audit_log').insert({ actor_id: actor, action, details }).then(() => {}, () => {});

// Supabase returns at most 1000 rows per request, so read big tables page by page.
async function fetchAll(make) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await make().range(from, from + 999);
    if (error) throw error;
    out.push(...data);
    if (data.length < 1000) return out;
  }
}

// After lessons disappear, every learner's saved "% complete" for the course is out of date. Recompute it.
async function refreshCourseProgress(courseId) {
  const { data: mods } = await sb.from('modules').select('lessons(id)').eq('course_id', courseId);
  const ids = (mods || []).flatMap((m) => m.lessons.map((l) => l.id));
  const rows = await fetchAll(() => sb.from('user_course_progress').select('user_id').eq('course_id', courseId));
  if (!rows.length) return;
  const done = new Map();
  if (ids.length) {
    const completed = await fetchAll(() => sb.from('user_progress').select('user_id').eq('status', 'completed').in('lesson_id', ids));
    completed.forEach((d) => done.set(d.user_id, (done.get(d.user_id) || 0) + 1));
  }
  const now = new Date().toISOString();
  for (const r of rows) {
    const pct = ids.length ? Math.round(((done.get(r.user_id) || 0) / ids.length) * 100) : 0;
    await sb.from('user_course_progress')
      .update({ progress_percentage: pct, is_completed: ids.length > 0 && pct === 100, updated_at: now })
      .eq('user_id', r.user_id).eq('course_id', courseId);
  }
}

// Modules and lessons of one course (for the "Manage lessons" panel).
staff.get('/admin/courses/:id/lessons', admin, h(async (req, res) => {
  const { data, error } = await sb.from('modules').select('id,title,order_index,lessons(id,title,order_index)')
    .eq('course_id', req.params.id).order('order_index');
  if (error) throw error;
  data.forEach((m) => m.lessons.sort((a, b) => a.order_index - b.order_index));
  res.json(data);
}));

// "What will be lost?" numbers shown before a course is deleted.
staff.get('/admin/courses/:id/impact', admin, h(async (req, res) => {
  const { data: mods, error } = await sb.from('modules').select('lessons(id),quizzes(id)').eq('course_id', req.params.id);
  if (error) throw error;
  const quizIds = mods.flatMap((m) => m.quizzes.map((q) => q.id));
  const [learners, attempts] = await Promise.all([
    sb.from('user_course_progress').select('*', { count: 'exact', head: true }).eq('course_id', req.params.id),
    quizIds.length ? sb.from('quiz_attempts').select('*', { count: 'exact', head: true }).in('quiz_id', quizIds) : { count: 0 },
  ]);
  res.json({ modules: mods.length, lessons: mods.reduce((n, m) => n + m.lessons.length, 0),
    quizzes: quizIds.length, learners: learners.count || 0, attempts: attempts.count || 0 });
}));

staff.delete('/admin/courses/:id', admin, h(async (req, res) => {
  const { data: c } = await sb.from('courses').select('id,title,slug').eq('id', req.params.id).maybeSingle();
  if (!c) return res.status(404).json({ error: 'Course not found' });
  // Server-side safety catch, so a stray API call can't wipe a course: the exact title must be sent.
  if (req.body?.confirm_title !== c.title) return res.status(400).json({ error: 'Type the course title exactly to confirm.' });
  const { error } = await sb.from('courses').delete().eq('id', c.id);
  if (error) throw error;
  await logDelete(req.user.id, 'course.delete', { id: c.id, title: c.title, slug: c.slug });
  res.json({ ok: true });
}));

staff.delete('/admin/lessons/:id', admin, h(async (req, res) => {
  const { data: l } = await sb.from('lessons').select('id,title,module_id,modules(course_id)').eq('id', req.params.id).maybeSingle();
  if (!l) return res.status(404).json({ error: 'Lesson not found' });
  const { error } = await sb.from('lessons').delete().eq('id', l.id);
  if (error) throw error;
  // Close the gap in the numbering (1,2,4 -> 1,2,3) so lessons added later don't clash with existing numbers.
  const { data: rest } = await sb.from('lessons').select('id,order_index').eq('module_id', l.module_id).order('order_index');
  for (const [i, x] of (rest || []).entries()) {
    if (x.order_index !== i + 1) await sb.from('lessons').update({ order_index: i + 1 }).eq('id', x.id);
  }
  await refreshCourseProgress(l.modules.course_id);
  await logDelete(req.user.id, 'lesson.delete', { id: l.id, title: l.title });
  res.json({ ok: true });
}));