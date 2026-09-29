import { Router } from 'express';
import { sb } from '../supabase.js';
import { h, byOrder } from '../middleware.js';
export const learning = Router();

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

learning.post('/lessons/:id/complete', h(async (req, res) => {
  const uid = req.user.id, now = new Date().toISOString();
  await sb.from('user_progress').upsert({ user_id: uid, lesson_id: req.params.id, status: 'completed', completed_at: now, updated_at: now },
    { onConflict: 'user_id,lesson_id' });
  const { data: l } = await sb.from('lessons').select('modules(course_id)').eq('id', req.params.id).single();
  const courseId = l.modules.course_id;
  const { data: all } = await sb.from('lessons').select('id, modules!inner(course_id)').eq('modules.course_id', courseId);
  const { count } = await sb.from('user_progress').select('*', { count: 'exact', head: true })
    .eq('user_id', uid).eq('status', 'completed').in('lesson_id', all.map((x) => x.id));
  const pct = Math.round((count / all.length) * 100);
  await sb.from('user_course_progress').upsert({ user_id: uid, course_id: courseId, progress_percentage: pct,
    is_completed: pct === 100, completed_at: pct === 100 ? now : null, updated_at: now }, { onConflict: 'user_id,course_id' });
  res.json({ progress: pct, badges: await awardBadges(uid) });
}));

learning.post('/lessons/:id/runs', h(async (req, res) => {
  const { code, output = '', hasError = false } = req.body;
  if (typeof code !== 'string' || code.length > 20000) return res.status(400).json({ error: 'Invalid code' });
  await sb.from('code_runs').insert({ user_id: req.user.id, lesson_id: req.params.id, code_content: code, output, has_error: !!hasError });
  res.json({ ok: true });
}));

// Quiz is returned WITHOUT is_correct.
learning.get('/quizzes/:id', h(async (req, res) => {
  const { data, error } = await sb.from('quizzes')
    .select('id,title,description,pass_score,quiz_questions(id,question_text,question_type,order_index,quiz_options(id,option_text,order_index))')
    .eq('id', req.params.id).single();
  if (error) return res.status(404).json({ error: 'Quiz not found' });
  data.quiz_questions.sort(byOrder).forEach((q) => q.quiz_options.sort(byOrder));
  res.json(data);
}));

learning.post('/quizzes/:id/submit', h(async (req, res) => {
  const answers = req.body.answers || {};
  const { data: quiz, error } = await sb.from('quizzes')
    .select('pass_score, quiz_questions(id, quiz_options(id,is_correct))').eq('id', req.params.id).single();
  if (error) return res.status(404).json({ error: 'Quiz not found' });
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
  const { data: att } = await sb.from('quiz_attempts')
    .insert({ user_id: req.user.id, quiz_id: req.params.id, score, passed, completed_at: new Date().toISOString() }).select().single();
  const ans = rows.flatMap((r) => r.picked.map((id) => ({ attempt_id: att.id, question_id: r.question_id, selected_option_id: id, is_correct: r.ok })));
  if (ans.length) await sb.from('quiz_attempt_answers').insert(ans);
  res.json({ score, passed, passScore: quiz.pass_score, correct: right, total });
}));
