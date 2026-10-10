// =====================================================================
// NEW FILE – client/src/pages/Leaderboard.jsx   (route: /leaderboard)
// Student view: "where do I stand?" + a leaderboard that respects privacy.
//   • Others appear as "Amina W." – only you see your own full name
//   • Learners can hide themselves; they still see their own rank privately
//   • Ranked against your cohort (default) or everyone
// =====================================================================
import { Fragment, useEffect, useState } from 'react';
import { api, useApi } from '../api';
import Tabs from '../components/Tabs';
import '../components/Assessment.css';

const MEDAL = { 1: '🥇', 2: '🥈', 3: '🥉' };

export default function Leaderboard() {
  const [scope, setScope] = useState('cohort'), [classId, setClassId] = useState('');
  const [fresh, reload, err] = useApi(`/leaderboard?scope=${scope}${classId ? `&class_id=${classId}` : ''}`);
  // useApi clears its data on every change; keep showing the previous board (dimmed) instead of flashing "Loading…".
  const [last, setLast] = useState(null);
  useEffect(() => { if (fresh) setLast(fresh); }, [fresh]);
  const d = fresh || last, loading = !fresh;
  const [busy, setBusy] = useState(false), [vErr, setVErr] = useState('');

  async function setVisible(visible) {
    setBusy(true); setVErr('');
    try { await api('/leaderboard/visibility', { method: 'PUT', body: { visible } }); await reload(); }
    catch (e) { setVErr(e.message); } finally { setBusy(false); }
  }

  if (!d) return <><h1>Leaderboard</h1><p className={err ? 'note error' : ''}>{err || 'Loading…'}</p></>;
  const me = d.me;
  // How far to the next grade? bands are listed highest first.
  const next = me && [...d.bands].reverse().find((b) => b.min > me.score);
  const cohortLabel = d.cohorts.find((c) => c.id === d.cohort_id)?.name;

  return (
    <div style={{ opacity: loading ? 0.6 : 1 }} aria-busy={loading}>
      <h1>Leaderboard</h1>

      {me ? (
        <section className="card standing" aria-label="Your standing">
          <div className={`bigGrade grade-${me.grade}`} aria-label={`Grade ${me.grade}`}>{me.grade}</div>
          <div className="standing-main">
            <p className="muted">Your standing{d.scope === 'cohort' ? ` in ${cohortLabel}` : ' among all learners'}</p>
            <h2>#{me.rank} <small>of {me.of}</small> · {me.score}%</h2>
            <p>{me.remark}{next ? <> — <b>{Math.round((next.min - me.score) * 10) / 10} more points</b> to reach grade {next.letter}.</> : ' — top grade band, keep it up!'}</p>
            <div className="split-bars">
              <div><span className="muted">Lessons · {me.lessons_completed}/{me.lessons_total}</span><div className="bar"><i style={{ width: `${me.lessons_pct}%` }} /></div></div>
              <div><span className="muted">Quizzes · {me.quizzes_total ? `${me.quiz_avg}% average` : 'none yet'}</span><div className="bar"><i style={{ width: `${me.quiz_avg}%` }} /></div></div>
            </div>
          </div>
        </section>
      ) : <div className="note">You're signed in as staff, so you aren't ranked. Here is how learners are doing.</div>}

      <p className="muted">Score = {d.weights.lessons}% lessons completed + {d.weights.quizzes}% quiz average. Your <b>best</b> attempt on each quiz counts, so retaking a quiz can only help.</p>

      <div className="row">
        {d.cohorts.length > 0 && <Tabs tabs={[['cohort', 'My cohort'], ['all', 'Everyone']]} value={d.scope} onChange={(s) => { setScope(s); }} />}
        {d.scope === 'cohort' && d.cohorts.length > 1 && (
          <label className="f">Cohort
            <select value={d.cohort_id || ''} onChange={(e) => setClassId(e.target.value)}>{d.cohorts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>)}
      </div>

      <div className="card scroll">
        {d.board.length === 0 ? <p>No one is on the board yet. Complete a lesson or take a quiz to get things started!</p> : (
          <table className="rank-table">
            <caption className="sr">Leaderboard</caption>
            <thead><tr><th>Rank</th><th>Learner</th><th>Lessons</th><th>Quiz avg</th><th>Score</th><th>Grade</th></tr></thead>
            <tbody>
              {d.board.map((r, i) => (
                <Fragment key={`${r.rank}-${i}`}>
                  {r.after_gap && <tr className="gap"><td colSpan={6} aria-hidden="true">⋯</td></tr>}
                  <tr className={r.is_me ? 'me' : ''} aria-current={r.is_me ? 'true' : undefined}>
                    <td className="rk">{MEDAL[r.rank] ? <span aria-label={`Rank ${r.rank}`}>{MEDAL[r.rank]}</span> : r.rank}</td>
                    <td>{r.name}{r.is_me && <span className="tag"> you</span>}</td>
                    <td>{r.lessons_completed}</td><td>{r.quiz_avg}%</td><td><b>{r.score}%</b></td>
                    <td><span className={`gr grade-${r.grade}`}>{r.grade}</span></td>
                  </tr>
                </Fragment>))}
            </tbody>
          </table>)}
      </div>

      {me && (
        <div className="card">
          <label className="check">
            <input type="checkbox" checked={me.visible} disabled={busy} onChange={(e) => setVisible(e.target.checked)} />
            Show me on the leaderboard
          </label>
          <p className="muted">Other learners only see your first name and last initial. {me.visible ? '' : 'You are hidden right now: only you can see this rank, and you are not listed for others.'}</p>
          {vErr && <p className="note error" role="alert">{vErr}</p>}
        </div>
      )}
    </div>
  );
}
