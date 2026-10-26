import { Router } from 'express';
import { sb } from '../supabase.js';
import { h, byOrder } from '../middleware.js';
import { lessonState, isOpen, canEnter } from '../lib/visibility.js';   // NEW
import { renderLesson } from '../lib/lessonText.js';   // NEW: plain-text notes -> HTML (presentation lives here)
export const content = Router();

// NEW: staff may preview unpublished (draft) courses; learners may not.
async function isStaff(uid) {
  const { data } = await sb.from('users').select('role').eq('id', uid).single();
  return ['teacher', 'admin'].includes(data?.role);
}

// NEW: what a LEARNER is allowed to know about a lesson – never the code itself.
function learnerLesson(l, unlocked, now) {
  const { access_code, code_expires_at, requires_code, is_hidden, ...rest } = l;
  const st = lessonState(l, now);
  if (st === 'scheduled') return { ...rest, locked: 'date' };                               // opens at release_at
  if (st === 'waiting') return { ...rest, release_at: null, locked: 'teacher' };            // teacher hasn't issued a code
  if (st === 'coded' && !unlocked.has(l.id)) return { ...rest, release_at: null, locked: 'code' };   // needs the class code
  return { ...rest, release_at: null };
}

content.get('/courses', h(async (req, res) => {
  const { data: courses, error } = await sb.from('courses')
    .select('*, modules(lessons(id,is_hidden,release_at,requires_code,access_code), quizzes(id))').eq('is_published', true).order('created_at');   // CHANGED: + is_hidden
  if (error) throw error;
  const { data: prog } = await sb.from('user_course_progress')
    .select('course_id, progress_percentage, last_accessed_lesson_id').eq('user_id', req.user.id);
  const map = Object.fromEntries((prog || []).map((p) => [p.course_id, p]));
  // NEW: hidden lessons don't count, and "continue" never points at a lesson that is currently hidden.
  res.json(courses.map(({ modules, ...c }) => {
    const hidden = new Set(modules.flatMap((m) => m.lessons.filter((l) => !isOpen(l)).map((l) => l.id)));
    const last = map[c.id]?.last_accessed_lesson_id ?? null;
    return {
      ...c,
      total_lessons: modules.reduce((n, m) => n + m.lessons.filter((l) => isOpen(l)).length, 0),
      total_quizzes: modules.reduce((n, m) => n + m.quizzes.length, 0),
      progress: Number(map[c.id]?.progress_percentage ?? 0),
      last_lesson_id: last && !hidden.has(last) ? last : null,
    };
  }));
}));

content.get('/courses/:slug', h(async (req, res) => {
  const { data: course, error } = await sb.from('courses')
    .select('*, modules(*, lessons(id,title,order_index,estimated_minutes,is_hidden,release_at,requires_code,access_code,code_expires_at), quizzes(id,title,pass_score))')   // CHANGED: + is_hidden
    .eq('slug', req.params.slug).single();
  if (error) return res.status(404).json({ error: 'Course not found' });
  // NEW: new courses start as hidden drafts – don't let learners open them by guessing the URL.
  const staff = await isStaff(req.user.id);
  if (!course.is_published && !staff) return res.status(404).json({ error: 'Course not found' });
  // NEW: for learners, hidden lessons disappear; scheduled / waiting / code-needed lessons stay as LOCKED rows.
  // Teachers/admins see everything (with the state and the code attached).
  if (!staff) {
    const now = Date.now();
    const allIds = course.modules.flatMap((m) => m.lessons.map((l) => l.id));
    const { data: un } = allIds.length ? await sb.from('lesson_unlocks').select('lesson_id').eq('user_id', req.user.id).in('lesson_id', allIds) : { data: [] };
    const unlocked = new Set((un || []).map((u) => u.lesson_id));
    course.modules.forEach((m) => {
      m.lessons = m.lessons.filter((l) => lessonState(l, now) !== 'hidden').map((l) => learnerLesson(l, unlocked, now));
    });
  }
  const ids = course.modules.flatMap((m) => m.lessons.map((l) => l.id));
  const { data: done } = await sb.from('user_progress').select('lesson_id,status').eq('user_id', req.user.id).in('lesson_id', ids);
  const st = Object.fromEntries((done || []).map((d) => [d.lesson_id, d.status]));
  // NEW: the learner's best score on each quiz, shown next to the quiz on the course page.
  const qids = course.modules.flatMap((m) => m.quizzes.map((q) => q.id));
  const { data: att } = qids.length ? await sb.from('quiz_attempts').select('quiz_id,score').eq('user_id', req.user.id).in('quiz_id', qids) : { data: [] };
  const best = {}; (att || []).forEach((a) => { if (a.score != null && a.score > (best[a.quiz_id] ?? -1)) best[a.quiz_id] = a.score; });
  course.modules.sort(byOrder).forEach((m) => {
    m.lessons.sort(byOrder).forEach((l) => (l.status = st[l.id] || 'not_started'));
    m.quizzes.forEach((q) => (q.best_score = best[q.id] ?? null)); // NEW
  });
  res.json(course);
}));

content.get('/lessons/:id', h(async (req, res) => {
  const { data: l, error } = await sb.from('lessons')
    // CHANGED: select now also loads courses.is_published (for the draft check below)
    .select('*, modules(id, course_id, courses(slug,is_published))').eq('id', req.params.id).single();
  if (error) return res.status(404).json({ error: 'Lesson not found' });
  // NEW: same draft protection for lessons.
  const staff = await isStaff(req.user.id);
  if (!l.modules.courses.is_published && !staff) return res.status(404).json({ error: 'Lesson not found' });
  // NEW: hidden / scheduled / code-locked lessons.
  let unlocked = new Set();
  const { data: sibs } = await sb.from('lessons').select('id,order_index,is_hidden,release_at,requires_code,access_code').eq('module_id', l.module_id);
  if (!staff) {
    const { data: un } = await sb.from('lesson_unlocks').select('lesson_id').eq('user_id', req.user.id).in('lesson_id', (sibs || []).map((x) => x.id));
    unlocked = new Set((un || []).map((u) => u.lesson_id));
    if (lessonState(l) === 'hidden') return res.status(404).json({ error: 'This lesson has not been released yet.' });
    if (!canEnter(l, unlocked)) {
      // Locked: tell the page WHY (so it can show a code box) but send no lesson text and record nothing.
      const v = learnerLesson(l, unlocked, Date.now());
      return res.json({ id: l.id, title: l.title, locked: v.locked, release_at: v.release_at, course_slug: l.modules.courses.slug });
    }
  }
  const ordered = (sibs || []).filter((x) => !x.is_hidden).sort(byOrder);
  let next = ordered[ordered.findIndex((x) => x.id === l.id) + 1];
  if (!staff && next && !canEnter(next, unlocked)) next = null;   // CHANGED: never jump past a locked lesson – go back to the course page
  const now = new Date().toISOString();
  await sb.from('user_progress').upsert({ user_id: req.user.id, lesson_id: l.id, status: 'in_progress' },
    { onConflict: 'user_id,lesson_id', ignoreDuplicates: true });
  await sb.from('user_course_progress').upsert({ user_id: req.user.id, course_id: l.modules.course_id,
    last_accessed_lesson_id: l.id, updated_at: now }, { onConflict: 'user_id,course_id' });
  // NEW: the learner's own saved work for this lesson (null until they save/autosave once).
  const { data: saved } = await sb.from('user_code').select('code').eq('user_id', req.user.id).eq('lesson_id', l.id).maybeSingle();
  const { access_code, code_expires_at, requires_code, ...pub } = l;   // NEW: the code is only ever sent to staff
  res.json({ ...(staff ? l : pub), content: renderLesson(l.content), course_slug: l.modules.courses.slug, next_id: next?.id ?? null, saved_code: saved?.code ?? null, modules: undefined });
}));
