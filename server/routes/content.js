import { Router } from 'express';
import { sb } from '../supabase.js';
import { h, byOrder } from '../middleware.js';
export const content = Router();

// NEW: staff may preview unpublished (draft) courses; learners may not.
async function isStaff(uid) {
  const { data } = await sb.from('users').select('role').eq('id', uid).single();
  return ['teacher', 'admin'].includes(data?.role);
}

content.get('/courses', h(async (req, res) => {
  const { data: courses, error } = await sb.from('courses')
    .select('*, modules(lessons(id), quizzes(id))').eq('is_published', true).order('created_at');
  if (error) throw error;
  const { data: prog } = await sb.from('user_course_progress')
    .select('course_id, progress_percentage, last_accessed_lesson_id').eq('user_id', req.user.id);
  const map = Object.fromEntries((prog || []).map((p) => [p.course_id, p]));
  res.json(courses.map(({ modules, ...c }) => ({
    ...c,
    total_lessons: modules.reduce((n, m) => n + m.lessons.length, 0),
    total_quizzes: modules.reduce((n, m) => n + m.quizzes.length, 0),
    progress: Number(map[c.id]?.progress_percentage ?? 0),
    last_lesson_id: map[c.id]?.last_accessed_lesson_id ?? null,
  })));
}));

content.get('/courses/:slug', h(async (req, res) => {
  const { data: course, error } = await sb.from('courses')
    .select('*, modules(*, lessons(id,title,order_index,estimated_minutes), quizzes(id,title,pass_score))')
    .eq('slug', req.params.slug).single();
  if (error) return res.status(404).json({ error: 'Course not found' });
  // NEW: new courses start as hidden drafts – don't let learners open them by guessing the URL.
  if (!course.is_published && !(await isStaff(req.user.id))) return res.status(404).json({ error: 'Course not found' });
  const ids = course.modules.flatMap((m) => m.lessons.map((l) => l.id));
  const { data: done } = await sb.from('user_progress').select('lesson_id,status').eq('user_id', req.user.id).in('lesson_id', ids);
  const st = Object.fromEntries((done || []).map((d) => [d.lesson_id, d.status]));
  course.modules.sort(byOrder).forEach((m) => {
    m.lessons.sort(byOrder).forEach((l) => (l.status = st[l.id] || 'not_started'));
  });
  res.json(course);
}));

content.get('/lessons/:id', h(async (req, res) => {
  const { data: l, error } = await sb.from('lessons')
    // CHANGED: select now also loads courses.is_published (for the draft check below)
    .select('*, modules(id, course_id, courses(slug,is_published))').eq('id', req.params.id).single();
  if (error) return res.status(404).json({ error: 'Lesson not found' });
  // NEW: same draft protection for lessons.
  if (!l.modules.courses.is_published && !(await isStaff(req.user.id))) return res.status(404).json({ error: 'Lesson not found' });
  const { data: sibs } = await sb.from('lessons').select('id,order_index').eq('module_id', l.module_id);
  const ordered = (sibs || []).sort(byOrder);
  const next = ordered[ordered.findIndex((x) => x.id === l.id) + 1];
  const now = new Date().toISOString();
  await sb.from('user_progress').upsert({ user_id: req.user.id, lesson_id: l.id, status: 'in_progress' },
    { onConflict: 'user_id,lesson_id', ignoreDuplicates: true });
  await sb.from('user_course_progress').upsert({ user_id: req.user.id, course_id: l.modules.course_id,
    last_accessed_lesson_id: l.id, updated_at: now }, { onConflict: 'user_id,course_id' });
  // NEW: the learner's own saved work for this lesson (null until they save/autosave once).
  const { data: saved } = await sb.from('user_code').select('code').eq('user_id', req.user.id).eq('lesson_id', l.id).maybeSingle();
  res.json({ ...l, course_slug: l.modules.courses.slug, next_id: next?.id ?? null, saved_code: saved?.code ?? null, modules: undefined });
}));