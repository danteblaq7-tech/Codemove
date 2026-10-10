// =====================================================================
// NEW FILE – client/src/components/Rankings.jsx
// Staff view: every learner ranked by overall score with a grade.
//   <Rankings isAdmin />  → all learners, or filter by cohort
//   <Rankings />          → teacher: only the learners in their own cohorts
// The scoring policy (weights + grade bands) comes from the server (server/lib/scores.js),
// so what is shown here always matches how grades were calculated.
// =====================================================================
import { useMemo, useState } from 'react';
import { useApi } from '../api';
import { downloadCsv } from '../lib/csv';
import './Assessment.css';

const PAGE = 100;

export default function Rankings({ isAdmin = false }) {
  const [classes] = useApi(isAdmin ? '/admin/classes' : '/staff/classes');
  const [classId, setClassId] = useState('');
  const [q, setQ] = useState(''), [grade, setGrade] = useState(''), [limit, setLimit] = useState(PAGE);
  const [d, reload, err] = useApi(`/staff/rankings${classId ? `?class_id=${classId}` : ''}`);

  const rows = useMemo(() => {
    if (!d) return [];
    const s = q.trim().toLowerCase();
    return d.rows.filter((r) => (!grade || r.grade === grade) && (!s || r.full_name.toLowerCase().includes(s) || r.email.toLowerCase().includes(s)));
  }, [d, q, grade]);

  const cohortName = classes?.find((c) => c.id === classId)?.name;
  const policy = d && `Score = ${d.weights.lessons}% lessons completed + ${d.weights.quizzes}% quiz average (best attempt per quiz; quizzes not yet taken count as 0).`;

  const exportCsv = () => d && downloadCsv(`rankings-${(cohortName || 'all-learners').replace(/\W+/g, '-').toLowerCase()}.csv`, [
    ['rank', 'name', 'email', 'lessons_completed', 'lessons_total', 'quiz_average_%', 'quizzes_taken', 'quizzes_total', 'overall_score_%', 'grade', 'remark'],
    ...d.rows.map((r) => [r.rank, r.full_name, r.email, r.lessons_completed, r.lessons_total, r.quiz_avg, r.quizzes_taken, r.quizzes_total, r.score, r.grade, r.remark])]);

  return (
    <>
      <div className="card">
        <div className="row">
          <label className="f">Show
            <select value={classId} onChange={(e) => { setClassId(e.target.value); setLimit(PAGE); }}>
              <option value="">{isAdmin ? 'All learners' : 'All my cohorts'}</option>
              {(classes || []).map((c) => <option key={c.id} value={c.id}>{c.name} ({c.learners})</option>)}
            </select></label>
          <label className="f">Search<input type="search" value={q} placeholder="Name or email" onChange={(e) => { setQ(e.target.value); setLimit(PAGE); }} /></label>
          <button className="btn ghost" onClick={reload}>↻ Refresh</button>
          <button className="btn" onClick={exportCsv} disabled={!d?.rows.length}>Export CSV</button>
        </div>
        {d && <p className="muted">{policy} Rank is within {cohortName ? `“${cohortName}”` : isAdmin ? 'all learners' : 'your cohorts'}; equal scores share a rank.</p>}
      </div>

      {/* The controls above stay on screen while a new filter loads (useApi clears `d` on every change). */}
      {!d ? <p className={err ? 'note error' : ''}>{err || 'Loading…'}</p> : <>
      <div className="stat-row" aria-label="Summary">
        <div className="card stat"><b>{d.summary.learners}</b><span>learners</span></div>
        <div className="card stat"><b>{d.summary.average}%</b><span>average score</span></div>
        {d.bands.map((b) => (
          <button key={b.letter} className={`card stat gradebtn ${grade === b.letter ? 'on' : ''}`} aria-pressed={grade === b.letter}
            onClick={() => { setGrade(grade === b.letter ? '' : b.letter); setLimit(PAGE); }} title={`${b.remark} (${b.min}%+) – click to filter`}>
            <b><span className={`gr grade-${b.letter}`}>{b.letter}</span> {d.summary.distribution[b.letter] ?? 0}</b><span>{b.min}%+</span>
          </button>))}
      </div>

      {!d.rows.length ? <div className="card">No learners to rank yet. Add students to a cohort first (Classes tab).</div> : (
        <div className="card scroll">
          <table className="rank-table">
            <caption className="sr">Learner ranking</caption>
            <thead><tr><th>Rank</th><th>Learner</th><th>Lessons</th><th>Quiz avg</th><th>Score</th><th>Grade</th></tr></thead>
            <tbody>
              {rows.slice(0, limit).map((r) => (
                <tr key={r.user_id}>
                  <td className="rk">{r.rank}</td>
                  <td>{r.full_name}<small className="muted block">{r.email}</small></td>
                  <td><span className="meter"><i style={{ width: `${r.lessons_total ? (100 * r.lessons_completed) / r.lessons_total : 0}%` }} /></span>{r.lessons_completed}/{r.lessons_total}</td>
                  <td>{r.quizzes_total ? `${r.quiz_avg}%` : '—'}<small className="muted block">{r.quizzes_taken}/{r.quizzes_total} taken</small></td>
                  <td><b>{r.score}%</b></td>
                  <td><span className={`gr grade-${r.grade}`} title={r.remark}>{r.grade}</span> <small className="muted">{r.remark}</small></td>
                </tr>))}
              {!rows.length && <tr><td colSpan={6}>No learners match your filters.</td></tr>}
            </tbody>
          </table>
          {rows.length > limit && <p><button className="btn ghost sm" onClick={() => setLimit(limit + PAGE)}>Show {Math.min(PAGE, rows.length - limit)} more ({rows.length - limit} hidden)</button></p>}
        </div>
      )}
      </>}
    </>
  );
}
