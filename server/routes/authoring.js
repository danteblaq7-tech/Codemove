// =====================================================================
// NEW FILE – server/routes/authoring.js
// Everything for "add course / add module / add lesson / bulk-add students".
// Registered in server/index.js. Roles are checked from the DATABASE
// (requireRole), never from anything the browser sends.
// =====================================================================
import { Router } from 'express';
import crypto from 'node:crypto';
import { sb } from '../supabase.js';
import { h, requireRole } from '../middleware.js';

export const authoring = Router();
const teacher = requireRole('teacher', 'admin');
const admin = requireRole('admin');

// Set TEACHERS_CAN_CREATE_LEARNERS=false in server/.env to make bulk import
// enrol EXISTING learners only (admins can still create accounts).
const TEACHERS_CAN_CREATE = process.env.TEACHERS_CAN_CREATE_LEARNERS !== 'false';

/* ---------------- small helpers ---------------- */
const str = (v, max) => String(v ?? '').trim().slice(0, max);
const slugify = (s) =>
  s.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_-]+/g, '-').slice(0, 60) || 'course';

// Next order_index inside a parent (lessons in a module, modules in a course).
async function nextOrder(table, parentCol, parentId) {
  const { data } = await sb.from(table).select('order_index').eq(parentCol, parentId)
    .order('order_index', { ascending: false }).limit(1);
  return (data?.[0]?.order_index ?? 0) + 1;
}

/* =====================================================================
   COURSES / MODULES / LESSONS
   ===================================================================== */

// Courses + modules for the "Add lesson" pickers (includes unpublished drafts).
authoring.get('/staff/courses', teacher, h(async (_req, res) => {
  const { data, error } = await sb.from('courses')
    .select('id,title,is_published,modules(id,title,order_index)').order('created_at');
  if (error) throw error;
  data.forEach((c) => c.modules.sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)));
  res.json(data);
}));

// Create a course (admin only). Starts as a HIDDEN draft unless is_published is true,
// and gets a first module so lessons can be added straight away.
authoring.post('/admin/courses', admin, h(async (req, res) => {
  const title = str(req.body.title, 120);
  if (title.length < 3) return res.status(400).json({ error: 'Course title needs at least 3 characters' });
  const level = ['beginner', 'intermediate', 'advanced'].includes(req.body.difficulty_level) ? req.body.difficulty_level : 'beginner';
  const base = slugify(title);
  let course = null;
  for (let n = 1; n <= 5 && !course; n++) {            // "html-basics", "html-basics-2", ...
    const { data, error } = await sb.from('courses').insert({
      title, slug: n === 1 ? base : `${base}-${n}`, description: str(req.body.description, 1000),
      difficulty_level: level, is_published: req.body.is_published === true,
    }).select('id,slug').single();
    if (!error) course = data;
    else if (error.code !== '23505') throw error;       // 23505 = slug already taken → try the next one
  }
  if (!course) return res.status(409).json({ error: 'Could not create a unique link for this course – try a different title' });
  const { data: mod, error: me } = await sb.from('modules')
    .insert({ course_id: course.id, title: 'Getting started', order_index: 1 }).select('id').single();
  if (me) throw me;
  res.json({ ...course, module_id: mod.id });
}));

// Add a module (a section inside a course).
authoring.post('/staff/modules', teacher, h(async (req, res) => {
  const title = str(req.body.title, 120);
  if (!title) return res.status(400).json({ error: 'Module title is required' });
  const { data: c } = await sb.from('courses').select('id').eq('id', req.body.course_id).maybeSingle();
  if (!c) return res.status(404).json({ error: 'Course not found' });
  const { data, error } = await sb.from('modules')
    .insert({ course_id: c.id, title, order_index: await nextOrder('modules', 'course_id', c.id) }).select('id').single();
  if (error) throw error;
  res.json({ id: data.id });
}));

// Add a lesson to a module. Appended to the end of the module.
authoring.post('/staff/lessons', teacher, h(async (req, res) => {
  const title = str(req.body.title, 160);
  if (!title) return res.status(400).json({ error: 'Lesson title is required' });
  const { data: m } = await sb.from('modules').select('id').eq('id', req.body.module_id).maybeSingle();
  if (!m) return res.status(404).json({ error: 'Module not found' });
  const minutes = Math.min(240, Math.max(1, parseInt(req.body.estimated_minutes, 10) || 10));
  const { data, error } = await sb.from('lessons').insert({
    module_id: m.id, title, content: str(req.body.content, 60000), code_example: str(req.body.code_example, 20000),
    tip_text: str(req.body.tip_text, 500), estimated_minutes: minutes,
    order_index: await nextOrder('lessons', 'module_id', m.id),
  }).select('id').single();
  if (error) throw error;
  res.json({ id: data.id });
}));

/* =====================================================================
   BULK STUDENT IMPORT
   rows = [{ full_name, email, cohort }]   cohort is optional if default_class_id is sent.
   - Existing learner  → just enrolled in the cohort.
   - New email         → account created with a one-time temporary password, then enrolled.
   - Admin + create_missing_cohorts → unknown cohort names are created on the fly.
   Teachers can only use cohorts assigned to them. Returns a per-row report.
   ===================================================================== */
const EMAIL = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;
const MAX_ROWS = 1000;
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'; // no look-alike characters
const tempPassword = () => Array.from({ length: 10 }, () => ALPHABET[crypto.randomInt(ALPHABET.length)]).join('');
const nameFromEmail = (e) => e.split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const chunk = (arr, n) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));

// Runs fn over items with at most `size` in flight (keeps us inside Supabase Auth rate limits).
async function pool(items, size, fn) {
  const out = new Array(items.length); let i = 0;
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, async () => {
    while (i < items.length) { const k = i++; out[k] = await fn(items[k], k); }
  }));
  return out;
}

authoring.post('/staff/import-students', teacher, h(async (req, res) => {
  const rows = req.body.rows;
  if (!Array.isArray(rows) || !rows.length) return res.status(400).json({ error: 'No students to import' });
  if (rows.length > MAX_ROWS) return res.status(400).json({ error: `Import up to ${MAX_ROWS} students at a time` });
  const isAdmin = req.role === 'admin';
  const mayCreate = isAdmin || TEACHERS_CAN_CREATE;

  // 1) Which cohorts may this person use?
  let cq = sb.from('classes').select('id,name');
  if (!isAdmin) cq = cq.eq('teacher_id', req.user.id);
  const { data: classes, error: ce } = await cq;
  if (ce) throw ce;
  const byName = new Map(classes.map((c) => [c.name.trim().toLowerCase(), c]));
  const defaultClass = req.body.default_class_id ? classes.find((c) => c.id === req.body.default_class_id) : null;
  if (req.body.default_class_id && !defaultClass) return res.status(404).json({ error: 'Cohort not found' });

  // 2) Normalise every row (never trust the browser's validation).
  const items = rows.map((r, i) => {
    const email = str(r?.email, 254).toLowerCase();
    return { row: i + 1, email, full_name: str(r?.full_name, 120) || nameFromEmail(email), cohortName: str(r?.cohort, 120),
      cls: null, status: null, message: '' };
  });
  const skip = (it, msg) => { it.status = 'skipped'; it.message = msg; };
  items.forEach((it) => { if (!EMAIL.test(it.email)) skip(it, 'Invalid email'); });

  // 3) Create cohorts that don't exist yet (admin + explicit opt-in only).
  const missing = [...new Set(items.filter((it) => !it.status && it.cohortName && !byName.has(it.cohortName.toLowerCase()))
    .map((it) => it.cohortName))];
  if (missing.length && isAdmin && req.body.create_missing_cohorts === true) {
    const { data: made, error } = await sb.from('classes').insert(missing.map((name) => ({ name, teacher_id: null }))).select('id,name');
    if (error) throw error;
    made.forEach((c) => byName.set(c.name.trim().toLowerCase(), c));
  }
  const seen = new Set();
  items.forEach((it) => {
    if (it.status) return;
    it.cls = it.cohortName ? byName.get(it.cohortName.toLowerCase()) : defaultClass;
    if (!it.cls) return skip(it, it.cohortName ? `Cohort "${it.cohortName}" not found` : 'No cohort chosen');
    const key = `${it.email}|${it.cls.id}`;                 // same student twice in the same cohort
    if (seen.has(key)) return skip(it, 'Duplicate in list');
    seen.add(key);
  });

  // 4) Find students who already have an account.
  const live = items.filter((it) => !it.status);
  const existing = new Map();
  for (const part of chunk([...new Set(live.map((it) => it.email))], 100)) {
    const { data, error } = await sb.from('users').select('id,email,role,is_active').in('email', part);
    if (error) throw error;
    data.forEach((u) => existing.set(u.email.toLowerCase(), u));
  }

  // 5) Create accounts for new emails – once per email, even if listed in several cohorts.
  const fresh = new Map();                                   // email -> { id, password } | { error }
  const toCreate = [...new Set(live.filter((it) => !existing.has(it.email)).map((it) => it.email))];
  if (toCreate.length && mayCreate) {
    const nameOf = Object.fromEntries(live.map((it) => [it.email, it.full_name]));
    await pool(toCreate, 5, async (email) => {
      const password = tempPassword();
      const { data, error } = await sb.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: nameOf[email] } });
      fresh.set(email, error ? { error: error.message } : { id: data.user.id, password });
    });
  }
  const givenPassword = new Set();
  live.forEach((it) => {
    const u = existing.get(it.email);
    if (u) {
      if (u.role !== 'learner') return skip(it, `Existing account is a ${u.role}, not a learner`);
      if (!u.is_active) return skip(it, 'Account is disabled');
      it.user_id = u.id; it.status = 'enrolled'; return;
    }
    if (!mayCreate) return skip(it, 'No account yet – ask an admin to create it');
    const f = fresh.get(it.email);
    if (!f || f.error) { it.status = 'error'; it.message = f?.error || 'Could not create account'; return; }
    it.user_id = f.id;
    if (givenPassword.has(it.email)) it.status = 'enrolled';
    else { it.status = 'created'; it.password = f.password; givenPassword.add(it.email); }
  });

  // 6) Enrol everyone who has an account (idempotent: already-enrolled students are left alone).
  const ready = items.filter((it) => it.user_id);
  for (const part of chunk(ready, 500)) {
    const { error } = await sb.from('class_members')
      .upsert(part.map((it) => ({ class_id: it.cls.id, user_id: it.user_id })), { onConflict: 'class_id,user_id', ignoreDuplicates: true });
    if (error) part.forEach((it) => { it.status = 'error'; it.message = error.message; delete it.password; });
  }

  // 7) Report. Temporary passwords are returned ONCE here and never stored or logged.
  const results = items.map((it) => ({ row: it.row, email: it.email, full_name: it.full_name,
    cohort: it.cls?.name || it.cohortName, status: it.status, message: it.message, password: it.password }));
  const count = (s) => results.filter((r) => r.status === s).length;
  res.json({ summary: { total: results.length, created: count('created'), enrolled: count('enrolled'),
    skipped: count('skipped'), errors: count('error') }, results });
}));
