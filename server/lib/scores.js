// =====================================================================
// NEW FILE – server/lib/scores.js
// THE GRADING POLICY LIVES HERE. Change WEIGHTS / BANDS and restart the API.
//
//   overall score (0-100) = weighted mean of
//       lesson completion %  (completed lessons ÷ all lessons in published courses)
//       quiz average %       (mean of the learner's BEST score on every published quiz;
//                             a quiz not yet attempted counts as 0)
//   If there are no quizzes yet (or no lessons), the other part counts for 100%.
// =====================================================================
import { sb } from '../supabase.js';

export const WEIGHTS = { lessons: 40, quizzes: 60 };            // must be > 0; only the ratio matters

// Highest band first. Swap in your own scheme, e.g. Kenya CBC:
//   [{min:75,letter:'EE',remark:'Exceeding expectation'},{min:50,letter:'ME',remark:'Meeting expectation'},
//    {min:25,letter:'AE',remark:'Approaching expectation'},{min:0,letter:'BE',remark:'Below expectation'}]
export const BANDS = [
  { min: 80, letter: 'A', remark: 'Excellent' },
  { min: 70, letter: 'B', remark: 'Good' },
  { min: 60, letter: 'C', remark: 'Satisfactory' },
  { min: 50, letter: 'D', remark: 'Needs improvement' },
  { min: 0,  letter: 'E', remark: 'Below expectation' },
];
export const gradeFor = (score) => BANDS.find((b) => score >= b.min) || BANDS[BANDS.length - 1];

const round1 = (n) => Math.round(n * 10) / 10;

// Adds lessons_pct, quiz_avg, score, grade, remark to a learner_scores row.
export function scoreRow(r) {
  const lessonsPct = r.lessons_total ? (100 * r.lessons_completed) / r.lessons_total : null;
  const quizPct = r.quizzes_total ? r.quiz_points / r.quizzes_total : null;
  const parts = [];
  if (lessonsPct !== null) parts.push([lessonsPct, WEIGHTS.lessons]);
  if (quizPct !== null) parts.push([quizPct, WEIGHTS.quizzes]);
  const score = parts.length ? parts.reduce((s, [v, w]) => s + v * w, 0) / parts.reduce((s, [, w]) => s + w, 0) : 0;
  const g = gradeFor(round1(score));
  return { ...r, lessons_pct: round1(lessonsPct ?? 0), quiz_avg: round1(quizPct ?? 0), score: round1(score), grade: g.letter, remark: g.remark };
}

// Sorts best-first and adds `rank`. Equal scores share a rank (1, 2, 2, 4 …).
export function rankRows(rows) {
  const sorted = [...rows].sort((a, b) => b.score - a.score || b.quiz_avg - a.quiz_avg
    || b.lessons_completed - a.lessons_completed || a.full_name.localeCompare(b.full_name));
  let rank = 0;
  return sorted.map((r, i) => { if (i === 0 || r.score !== sorted[i - 1].score) rank = i + 1; return { ...r, rank }; });
}

// ---- load every learner's numbers (cached 30 s; PostgREST returns max 1000 rows per request, so we page) ----
const TTL = 30_000;
let cache = { at: 0, p: null };
export const invalidateScores = () => { cache = { at: 0, p: null }; };   // called after lessons/quizzes are completed

export function loadScores() {
  if (cache.p && Date.now() - cache.at < TTL) return cache.p;
  cache.at = Date.now();
  cache.p = (async () => {
    const out = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await sb.from('learner_scores').select('*').order('user_id').range(from, from + 999);
      if (error) throw error;
      out.push(...data.map(scoreRow));
      if (data.length < 1000) break;
    }
    return out;
  })().catch((e) => { cache = { at: 0, p: null }; throw e; });
  return cache.p;
}

// All user ids in the given classes (paged for the same 1000-row reason).
export async function memberIds(classIds) {
  const ids = new Set();
  for (const cid of classIds) {
    for (let from = 0; ; from += 1000) {
      const { data, error } = await sb.from('class_members').select('user_id').eq('class_id', cid).order('user_id').range(from, from + 999);
      if (error) throw error;
      data.forEach((m) => ids.add(m.user_id));
      if (data.length < 1000) break;
    }
  }
  return ids;
}
