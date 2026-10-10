// =====================================================================
// NEW FILE – server/routes/rankings.js
//   GET /staff/rankings?class_id=   teacher/admin: graded ranking of learners
//   GET /leaderboard?scope=&class_id=   learner: own standing + privacy-safe leaderboard
//   PUT /leaderboard/visibility     learner: opt in/out of being listed
// All numbers come from server/lib/scores.js (the grading policy).
// =====================================================================
import { Router } from 'express';
import { sb } from '../supabase.js';
import { h, requireRole } from '../middleware.js';
import { BANDS, WEIGHTS, invalidateScores, loadScores, memberIds, rankRows } from '../lib/scores.js';

export const rankings = Router();
const teacher = requireRole('teacher', 'admin');
const policy = { weights: WEIGHTS, bands: BANDS.map(({ min, letter, remark }) => ({ min, letter, remark })) };

/* ---------------------------------------------------------------------
   STAFF – full ranking with grades.
   Admin: everyone, or one cohort.  Teacher: only learners in their own cohorts.
   Rank is relative to the group being viewed (a cohort ranks against its own members).
   --------------------------------------------------------------------- */
rankings.get('/staff/rankings', teacher, h(async (req, res) => {
  let classIds;
  if (req.query.class_id) {
    let q = sb.from('classes').select('id').eq('id', req.query.class_id);
    if (req.role !== 'admin') q = q.eq('teacher_id', req.user.id);
    const { data: c } = await q.maybeSingle();
    if (!c) return res.status(404).json({ error: 'Class not found' });
    classIds = [c.id];
  } else if (req.role !== 'admin') {                         // teacher, no filter → all of their own cohorts
    const { data: own, error } = await sb.from('classes').select('id').eq('teacher_id', req.user.id);
    if (error) throw error;
    classIds = own.map((c) => c.id);
    if (!classIds.length) return res.json({ ...policy, summary: { learners: 0, average: 0, distribution: {} }, rows: [] });
  }
  const ids = classIds ? await memberIds(classIds) : null;     // null = everyone
  const rows = rankRows((await loadScores()).filter((r) => !ids || ids.has(r.user_id)));

  const distribution = Object.fromEntries(BANDS.map((b) => [b.letter, 0]));
  rows.forEach((r) => { distribution[r.grade] += 1; });
  const average = rows.length ? Math.round((rows.reduce((s, r) => s + r.score, 0) / rows.length) * 10) / 10 : 0;
  res.json({ ...policy, summary: { learners: rows.length, average, distribution },
    rows: rows.map((r) => ({ rank: r.rank, user_id: r.user_id, full_name: r.full_name, email: r.email,
      lessons_completed: r.lessons_completed, lessons_total: r.lessons_total, quiz_avg: r.quiz_avg,
      quizzes_taken: r.quizzes_taken, quizzes_total: r.quizzes_total, score: r.score, grade: r.grade, remark: r.remark })) });
}));

/* ---------------------------------------------------------------------
   LEARNER – leaderboard.
   Privacy: other learners appear as "Amina W." (first name + last initial); people who opted out
   and learners with no activity yet are not listed. A learner always sees their OWN rank.
   scope=cohort (default, if they belong to one) → ranked against cohort mates
   scope=all                                      → ranked against every active learner
   --------------------------------------------------------------------- */
const shortName = (n) => { const p = String(n || 'Learner').trim().split(/\s+/); return p.length > 1 ? `${p[0]} ${p[p.length - 1][0]}.` : p[0]; };
const TOP = { all: 20, cohort: 50 };

rankings.get('/leaderboard', h(async (req, res) => {
  const uid = req.user.id;
  const { data: mine, error: me } = await sb.from('class_members').select('classes(id,name)').eq('user_id', uid);
  if (me) throw me;
  const cohorts = (mine || []).map((m) => m.classes).filter(Boolean).sort((a, b) => a.name.localeCompare(b.name));
  const scope = req.query.scope === 'all' || !cohorts.length ? 'all' : 'cohort';
  const cohort = scope === 'cohort' ? cohorts.find((c) => c.id === req.query.class_id) || cohorts[0] : null;
  const ids = cohort ? await memberIds([cohort.id]) : null;

  const all = await loadScores();
  const meRow = all.find((r) => r.user_id === uid);          // undefined for teachers/admins (they are not ranked)
  const pool = all.filter((r) => (!ids || ids.has(r.user_id)) &&
    (r.user_id === uid || (r.show_on_leaderboard && (r.lessons_completed > 0 || r.quizzes_taken > 0))));
  const ranked = rankRows(pool);
  const mineRanked = ranked.find((r) => r.user_id === uid);

  const listed = ranked.filter((r) => r.user_id !== uid || r.show_on_leaderboard);
  const top = listed.slice(0, TOP[scope]);
  if (mineRanked?.show_on_leaderboard && !top.some((r) => r.user_id === uid)) top.push({ ...mineRanked, after_gap: true });
  const board = top.map((r) => ({ rank: r.rank, name: r.user_id === uid ? r.full_name : shortName(r.full_name), is_me: r.user_id === uid,
    score: r.score, grade: r.grade, lessons_completed: r.lessons_completed, quiz_avg: r.quiz_avg, after_gap: !!r.after_gap }));

  res.json({ ...policy, scope, cohorts, cohort_id: cohort?.id || null, board, total: pool.length,
    me: mineRanked ? { rank: mineRanked.rank, of: pool.length, score: mineRanked.score, grade: mineRanked.grade, remark: mineRanked.remark,
      lessons_completed: mineRanked.lessons_completed, lessons_total: mineRanked.lessons_total, lessons_pct: mineRanked.lessons_pct,
      quiz_avg: mineRanked.quiz_avg, quizzes_taken: mineRanked.quizzes_taken, quizzes_total: mineRanked.quizzes_total,
      visible: meRow?.show_on_leaderboard !== false } : null });
}));

rankings.put('/leaderboard/visibility', h(async (req, res) => {
  const { error } = await sb.from('users').update({ show_on_leaderboard: req.body.visible === true }).eq('id', req.user.id);
  if (error) throw error;
  invalidateScores();
  res.json({ ok: true });
}));
