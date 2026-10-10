// =====================================================================
// NEW FILE – server/routes/quizzes.js   (quiz AUTHORING for teachers and admins)
//   GET    /staff/quizzes        list every quiz
//   GET    /staff/quizzes/:id    one quiz WITH the correct answers (for editing)
//   POST   /staff/quizzes        create
//   PUT    /staff/quizzes/:id    edit (replaces the questions)
//   DELETE /admin/quizzes/:id    admin only – also deletes learners' attempts for it
// Learners take quizzes through /quizzes/:id in learning.js, which never sends is_correct.
// =====================================================================
import { Router } from 'express';
import { sb } from '../supabase.js';
import { requireRole } from '../middleware.js';
import { invalidateScores } from '../lib/scores.js';

export const quizzes = Router();
const teacher = requireRole('teacher', 'admin');
const admin = requireRole('admin');

// Like middleware `h`, but lets us answer 400 for validation problems.
const wrap = (fn) => (req, res) => fn(req, res).catch((e) => res.status(e.status || 500).json({ error: e.message }));
const bad = (m) => Object.assign(new Error(m), { status: 400 });
const str = (v, max) => String(v ?? '').trim().slice(0, max);

/* ---------- validation: nothing reaches the database unless it is a playable quiz ---------- */
function clean(b) {
  const title = str(b.title, 160);
  if (!title) throw bad('Quiz title is required');
  const pass = Math.min(100, Math.max(1, parseInt(b.pass_score, 10) || 70));
  const qs = Array.isArray(b.questions) ? b.questions : [];
  if (!qs.length) throw bad('Add at least one question');
  if (qs.length > 50) throw bad('A quiz can have at most 50 questions');
  const questions = qs.map((q, i) => {
    const n = `Question ${i + 1}`;
    const text = str(q?.question_text, 500);
    if (!text) throw bad(`${n} has no text`);
    const type = q.question_type === 'multiple' ? 'multiple' : 'single';
    const options = (Array.isArray(q.options) ? q.options : [])
      .map((o) => ({ option_text: str(o?.option_text, 300), is_correct: o?.is_correct === true })).filter((o) => o.option_text);
    if (options.length < 2) throw bad(`${n} needs at least 2 answer options`);
    if (options.length > 8) throw bad(`${n} can have at most 8 answer options`);
    const right = options.filter((o) => o.is_correct).length;
    if (!right) throw bad(`${n}: mark at least one correct answer`);
    if (type === 'single' && right !== 1) throw bad(`${n}: a single-answer question needs exactly one correct answer (or switch it to "multiple answers")`);
    return { question_text: text, question_type: type, options };
  });
  return { title, description: str(b.description, 500), pass_score: pass, questions };
}

// Inserts questions + options. If anything fails, removes what it inserted and rethrows.
async function writeQuestions(quizId, questions) {
  const { data: qrows, error } = await sb.from('quiz_questions')
    .insert(questions.map((q, i) => ({ quiz_id: quizId, question_text: q.question_text, question_type: q.question_type, order_index: i + 1 })))
    .select('id,order_index');
  if (error) throw error;
  const idByOrder = Object.fromEntries(qrows.map((r) => [r.order_index, r.id]));
  const newIds = qrows.map((r) => r.id);
  const opts = questions.flatMap((q, i) => q.options.map((o, k) => ({ question_id: idByOrder[i + 1], option_text: o.option_text, is_correct: o.is_correct, order_index: k + 1 })));
  const { error: oe } = await sb.from('quiz_options').insert(opts);
  if (oe) { await sb.from('quiz_questions').delete().in('id', newIds); throw oe; }
  return newIds;
}

/* ---------- list ---------- */
quizzes.get('/staff/quizzes', teacher, wrap(async (_req, res) => {
  const { data, error } = await sb.from('quizzes')
    .select('id,title,pass_score,module_id,modules(title,courses(title,is_published)),quiz_questions(count)').order('created_at', { ascending: false });
  if (error) throw error;
  res.json(data.map((q) => ({ id: q.id, title: q.title, pass_score: q.pass_score, module_id: q.module_id, module: q.modules?.title,
    course: q.modules?.courses?.title, published: !!q.modules?.courses?.is_published, questions: q.quiz_questions?.[0]?.count ?? 0 })));
}));

/* ---------- read one (with answers) ---------- */
quizzes.get('/staff/quizzes/:id', teacher, wrap(async (req, res) => {
  const { data: q, error } = await sb.from('quizzes')
    .select('id,title,description,pass_score,module_id,modules(course_id),quiz_questions(id,question_text,question_type,order_index,quiz_options(id,option_text,is_correct,order_index))')
    .eq('id', req.params.id).single();
  if (error) return res.status(404).json({ error: 'Quiz not found' });
  const { count } = await sb.from('quiz_attempts').select('*', { count: 'exact', head: true }).eq('quiz_id', q.id);
  const by = (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0);
  q.quiz_questions.sort(by).forEach((x) => x.quiz_options.sort(by));
  res.json({ id: q.id, title: q.title, description: q.description || '', pass_score: q.pass_score, module_id: q.module_id,
    course_id: q.modules?.course_id, attempts: count || 0,
    questions: q.quiz_questions.map((x) => ({ question_text: x.question_text, question_type: x.question_type,
      options: x.quiz_options.map((o) => ({ option_text: o.option_text, is_correct: o.is_correct })) })) });
}));

/* ---------- create ---------- */
quizzes.post('/staff/quizzes', teacher, wrap(async (req, res) => {
  const q = clean(req.body);
  const { data: m } = await sb.from('modules').select('id').eq('id', req.body.module_id).maybeSingle();
  if (!m) throw bad('Choose the module this quiz belongs to');
  const { data: quiz, error } = await sb.from('quizzes')
    .insert({ module_id: m.id, title: q.title, description: q.description, pass_score: q.pass_score, total_questions: q.questions.length }).select('id').single();
  if (error) throw error;
  try { await writeQuestions(quiz.id, q.questions); }
  catch (e) { await sb.from('quizzes').delete().eq('id', quiz.id); throw e; }   // never leave a half-built quiz behind
  invalidateScores();
  res.json({ id: quiz.id });
}));

/* ---------- edit ----------
   New questions are written FIRST, old ones removed after, so a failure keeps the old quiz intact.
   Learners' attempt SCORES are kept; per-question answer details of old attempts are removed with the old questions. */
quizzes.put('/staff/quizzes/:id', teacher, wrap(async (req, res) => {
  const q = clean(req.body);
  const { data: cur } = await sb.from('quizzes').select('id').eq('id', req.params.id).maybeSingle();
  if (!cur) return res.status(404).json({ error: 'Quiz not found' });
  const { data: old } = await sb.from('quiz_questions').select('id').eq('quiz_id', cur.id);
  await writeQuestions(cur.id, q.questions);
  if (old?.length) await sb.from('quiz_questions').delete().in('id', old.map((o) => o.id));
  const patch = { title: q.title, description: q.description, pass_score: q.pass_score, total_questions: q.questions.length };
  if (req.body.module_id) { const { data: m } = await sb.from('modules').select('id').eq('id', req.body.module_id).maybeSingle(); if (m) patch.module_id = m.id; }
  const { error } = await sb.from('quizzes').update(patch).eq('id', cur.id);
  if (error) throw error;
  invalidateScores();
  res.json({ ok: true });
}));

/* ---------- delete (admin) ---------- */
quizzes.delete('/admin/quizzes/:id', admin, wrap(async (req, res) => {
  const { error } = await sb.from('quizzes').delete().eq('id', req.params.id);
  if (error) throw error;
  invalidateScores();
  res.json({ ok: true });
}));
