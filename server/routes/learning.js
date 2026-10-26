import { Router } from 'express';
import { canEnter, isOpen, lessonState, niceDate } from '../lib/visibility.js';   // NEW
import { sb } from '../supabase.js';
import { h, byOrder } from '../middleware.js';
import { invalidateScores } from '../lib/scores.js'; // NEW: keep the leaderboard fresh
export const learning = Router();

// NEW: staff may open quizzes of unpublished (draft) courses to test them; learners may not.
async function isStaff(uid) {
  const { data } = await sb.from('users').select('role').eq('id', uid).single();
  return ['teacher', 'admin'].includes(data?.role);
}

// Awards any badge whose criteria the learner now meets.
async function awardBadges(uid) {
  const { count } = await sb.from('user_progress').select('*', { count: 'exact', head: true })
    .eq('user_id', uid).eq('status', 'completed');
  const [{ data: badges }, { data: owned }] = await Promise.all([
    sb.from('badges').select('*'), sb.from('user_badges').select('badge_id').eq('user_id', uid)]);
  const have = new Set((owned || []).map((o) => o.badge_id));
  const won = badges.filter((b) => b.criteria?.type === 'lessons_completed' && count >= b.criteria.count && !have.has(b.id));
  for (const b of won) {
    await sb.from('user_badges').insert({ user_id: uid, badge_id: b.id, status: 'completed', progress_percentage: 100 });
    await sb.from('notifications').insert({ user_id: uid, type: 'success', title: 'Badge earned', message: b.name });
  }
  return won.map((b) => b.name);
}

// NEW: may this person open this lesson? Teachers/admins always can; learners only when it is open for them.
async function mayOpenLesson(uid, lessonId) {
  if (await isStaff(uid)) return true;
  const { data: l } = await sb.from('lessons').select('id,is_hidden,release_at,requires_code,access_code').eq('id', lessonId).maybeSingle();
  if (!l) return false;
  const { data: un } = await sb.from('lesson_unlocks').select('lesson_id').eq('user_id', uid).eq('lesson_id', lessonId);
  return canEnter(l, new Set((un || []).map((u) => u.lesson_id)));
}
// NEW: a quiz stays shut while every lesson in its module is still locked for this learner.
async function quizLockedFor(uid, moduleId) {
  if (await isStaff(uid)) return false;
  const { data: ls } = await sb.from('lessons').select('id,is_hidden,release_at,requires_code,access_code').eq('module_id', moduleId);
  if (!ls?.length) return false;
  const { data: un } = await sb.from('lesson_unlocks').select('lesson_id').eq('user_id', uid).in('lesson_id', ls.map((l) => l.id));
  const unlocked = new Set((un || []).map((u) => u.lesson_id));
  return !ls.some((l) => canEnter(l, unlocked));
}
const LOCKED_QUIZ = 'This quiz opens after your teacher unlocks the lessons.';

// NEW: a few wrong guesses per learner are allowed, then a short cool-down (stops code guessing).
const wrong = new Map();   // user id -> [timestamps of wrong tries]
const tooMany = (uid) => (wrong.get(uid) || []).filter((t) => Date.now() - t < 600_000).length >= 8;
const noteWrong = (uid) => wrong.set(uid, [...(wrong.get(uid) || []).filter((t) => Date.now() - t < 600_000), Date.now()]);

// NEW: a learner types the class code the teacher gave them; that lesson then stays unlocked for them.
learning.post('/lessons/unlock', h(async (req, res) => {
  const uid = req.user.id;
  const code = String(req.body.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (code.length < 4 || code.length > 12) return res.status(400).json({ error: 'Type the code your teacher gave you.' });
  if (tooMany(uid)) return res.status(429).json({ error: 'Too many wrong tries. Wait a few minutes and try again.' });
  const { data: l } = await sb.from('lessons')
    .select('id,title,is_hidden,release_at,requires_code,access_code,code_expires_at,modules(courses(slug,is_published))')
    .eq('access_code', code).maybeSingle();
  if (!l || !l.requires_code || l.is_hidden || !l.modules.courses.is_published) { noteWrong(uid); return res.status(400).json({ error: 'That code is not valid.' }); }
  if (lessonState(l) === 'scheduled') return res.status(400).json({ error: `This lesson opens on ${niceDate(l.release_at)}.` });
  if (l.code_expires_at && new Date(l.code_expires_at) < new Date()) return res.status(400).json({ error: 'That code has expired. Ask your teacher for a new one.' });
  const { error } = await sb.from('lesson_unlocks').upsert({ user_id: uid, lesson_id: l.id }, { onConflict: 'user_id,lesson_id', ignoreDuplicates: true });
  if (error) throw error;
  res.json({ lesson_id: l.id, title: l.title, course_slug: l.modules.courses.slug });
}));

learning.post('/lessons/:id/complete', h(async (req, res) => {
  const uid = req.user.id, now = new Date().toISOString();
  const { data: l } = await sb.from('lessons').select('id, is_hidden, release_at, requires_code, access_code, modules(course_id)').eq('id', req.params.id).single();
  if (!l) return res.status(404).json({ error: 'Lesson not found' }); // NEW: was a 500 crash for unknown ids
  // NEW: a lesson that is hidden, not open yet, or still needs the learner's code can't be completed.
  const { data: un } = await sb.from('lesson_unlocks').select('lesson_id').eq('user_id', uid).eq('lesson_id', l.id);
  if (!canEnter(l, new Set((un || []).map((u) => u.lesson_id)))) return res.json({ progress: 0, badges: [], hidden: true });
  await sb.from('user_progress').upsert({ user_id: uid, lesson_id: req.params.id, status: 'completed', completed_at: now, updated_at: now },
    { onConflict: 'user_id,lesson_id' });
  const courseId = l.modules.course_id;
  // CHANGED: progress is worked out from the lessons that are OPEN (visible, or with a code issued).
  const { data: rows } = await sb.from('lessons').select('id, is_hidden, release_at, requires_code, access_code, modules!inner(course_id)').eq('modules.course_id', courseId);
  const all = (rows || []).filter((x) => isOpen(x));
  const { count } = await sb.from('user_progress').select('*', { count: 'exact', head: true })
    .eq('user_id', uid).eq('status', 'completed').in('lesson_id', all.map((x) => x.id));
  const pct = all.length ? Math.min(100, Math.round((count / all.length) * 100)) : 0;
  await sb.from('user_course_progress').upsert({ user_id: uid, course_id: courseId, progress_percentage: pct,
    is_completed: pct === 100, completed_at: pct === 100 ? now : null, updated_at: now }, { onConflict: 'user_id,course_id' });
  const badges = await awardBadges(uid);
  invalidateScores(); // NEW: lesson completion changes the learner's overall score
  res.json({ progress: pct, badges });
}));

learning.post('/lessons/:id/runs', h(async (req, res) => {
  if (!(await mayOpenLesson(req.user.id, req.params.id))) return res.status(403).json({ error: 'This lesson is locked.' });   // NEW
  const { code, output = '', hasError = false } = req.body;
  if (typeof code !== 'string' || code.length > 20000) return res.status(400).json({ error: 'Invalid code' });
  // CHANGED: the editor now sends the console output of the run – cap it so nobody can fill the table.
  await sb.from('code_runs').insert({ user_id: req.user.id, lesson_id: req.params.id, code_content: code,
    output: String(output).slice(0, 4000), has_error: !!hasError });
  res.json({ ok: true });
}));

// NEW: save the learner's work (Save button + autosave). One row per learner per lesson.
learning.put('/lessons/:id/code', h(async (req, res) => {
  if (!(await mayOpenLesson(req.user.id, req.params.id))) return res.status(403).json({ error: 'This lesson is locked.' });   // NEW
  const { code } = req.body;
  if (typeof code !== 'string' || code.length > 20000) return res.status(400).json({ error: 'Invalid code' });
  const { error } = await sb.from('user_code').upsert(
    { user_id: req.user.id, lesson_id: req.params.id, code, updated_at: new Date().toISOString() },
    { onConflict: 'user_id,lesson_id' });
  if (error) throw error;
  res.json({ ok: true });
}));

// Quiz is returned WITHOUT is_correct.
learning.get('/quizzes/:id', h(async (req, res) => {
  const { data, error } = await sb.from('quizzes')
    .select('id,module_id,title,description,pass_score,modules(courses(is_published)),quiz_questions(id,question_text,question_type,order_index,quiz_options(id,option_text,order_index))')
    .eq('id', req.params.id).single();   // CHANGED: + modules(courses(is_published)) for the draft check
  if (error) return res.status(404).json({ error: 'Quiz not found' });
  // NEW: draft protection, and never serve a quiz with no questions (the player would crash).
  if (!data.modules?.courses?.is_published && !(await isStaff(req.user.id))) return res.status(404).json({ error: 'Quiz not found' });
  if (await quizLockedFor(req.user.id, data.module_id)) return res.status(403).json({ error: LOCKED_QUIZ });   // NEW
  if (!data.quiz_questions.length) return res.status(404).json({ error: 'This quiz has no questions yet' });
  delete data.modules;
  data.quiz_questions.sort(byOrder).forEach((q) => q.quiz_options.sort(byOrder));
  res.json(data);
}));

learning.post('/quizzes/:id/submit', h(async (req, res) => {
  const answers = req.body.answers || {};
  const { data: quiz, error } = await sb.from('quizzes')
    .select('pass_score, module_id, quiz_questions(id, quiz_options(id,is_correct))').eq('id', req.params.id).single();
  if (error) return res.status(404).json({ error: 'Quiz not found' });
  if (await quizLockedFor(req.user.id, quiz.module_id)) return res.status(403).json({ error: LOCKED_QUIZ });   // NEW
  let right = 0; const rows = [];
  for (const q of quiz.quiz_questions) {
    const valid = q.quiz_options.map((o) => o.id);
    const picked = (answers[q.id] || []).filter((id) => valid.includes(id));
    const correct = q.quiz_options.filter((o) => o.is_correct).map((o) => o.id);
    const ok = picked.length === correct.length && correct.every((id) => picked.includes(id));
    if (ok) right++;
    rows.push({ question_id: q.id, picked, ok });
  }
  const total = quiz.quiz_questions.length;
  const score = total ? Math.round((right / total) * 100) : 0, passed = score >= quiz.pass_score;
  const { data: att, error: ae } = await sb.from('quiz_attempts')
    .insert({ user_id: req.user.id, quiz_id: req.params.id, score, passed, completed_at: new Date().toISOString() }).select().single();
  if (ae) throw ae; // NEW: was a crash on att.id if the insert failed
  const ans = rows.flatMap((r) => r.picked.map((id) => ({ attempt_id: att.id, question_id: r.question_id, selected_option_id: id, is_correct: r.ok })));
  if (ans.length) await sb.from('quiz_attempt_answers').insert(ans);
  invalidateScores(); // NEW: a new quiz score changes the learner's overall score and rank
  // NEW: best score so far on this quiz (retakes are allowed; the BEST one counts towards the grade)
  const { data: top } = await sb.from('quiz_attempts').select('score').eq('user_id', req.user.id).eq('quiz_id', req.params.id)
    .order('score', { ascending: false }).limit(1);
  res.json({ score, passed, passScore: quiz.pass_score, correct: right, total, best: top?.[0]?.score ?? score });
}));
