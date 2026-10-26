// =====================================================================
// REPLACES client/src/pages/Quiz.jsx
// Same quiz player as before, plus:
//   • shows an error instead of "Loading…" forever if the quiz can't be opened
//   • shows submit errors; guards against a quiz with no questions
//   • result screen shows your BEST score (it is the one that counts towards your grade) + link to the leaderboard
// =====================================================================
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, PartyPopper, Trophy } from 'lucide-react';
import { api } from '../api';

export default function Quiz() {
  const { id } = useParams();
  const [quiz, setQuiz] = useState(null);
  const [i, setI] = useState(0);
  const [ans, setAns] = useState({});
  const [result, setResult] = useState(null);
  const [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  useEffect(() => { setQuiz(null); setErr(''); api(`/quizzes/${id}`).then(setQuiz).catch((e) => setErr(e.message)); }, [id]);   // CHANGED: error is shown
  if (err && !quiz) return <><Link className="icon-link" to="/courses"><ArrowLeft aria-hidden="true" />Back to courses</Link><p className="note error" role="alert">{err}</p></>;
  if (!quiz) return <p>Loading…</p>;
  if (result) return (
    <div className="card"><h1>{result.passed && <PartyPopper className="inline-icon" aria-hidden="true" />}{result.passed ? ' You passed!' : 'Not quite yet'}</h1>
      <p>Score: <b>{result.score}%</b> ({result.correct} of {result.total} correct). Pass mark: {result.passScore}%.</p>
      {/* NEW: the best attempt is the one used for your overall grade */}
      <p className="muted">Your best score on this quiz: <b>{result.best}%</b>. Retaking can only improve your grade.</p>
      <button className="btn" onClick={() => { setResult(null); setAns({}); setI(0); }}>Try again</button>{' '}
      <Link className="btn ghost" to="/courses">Back to courses</Link>{' '}
      <Link className="btn ghost" to="/leaderboard">See the leaderboard <Trophy aria-hidden="true" /></Link></div>);
  const qs = quiz.quiz_questions;
  if (!qs.length) return <p className="note">This quiz has no questions yet.</p>;   // NEW guard
  const q = qs[i], picked = ans[q.id] || [];
  const toggle = (oid) => setAns({ ...ans, [q.id]: q.question_type === 'multiple'
    ? (picked.includes(oid) ? picked.filter((x) => x !== oid) : [...picked, oid]) : [oid] });
  const last = i === qs.length - 1;
  async function submit() {
    setBusy(true); setErr('');
    try { setResult(await api(`/quizzes/${id}/submit`, { method: 'POST', body: { answers: ans } })); }
    catch (e) { setErr(e.message); } finally { setBusy(false); }   // NEW: errors are shown
  }
  return (
    <>
      <h1>{quiz.title}</h1>
      <p className="muted">Question {i + 1} of {qs.length}{q.question_type === 'multiple' ? ' · select all that apply' : ''}</p>
      <div className="bar"><i style={{ width: `${((i + 1) / qs.length) * 100}%` }} /></div>
      <h2>{q.question_text}</h2>
      {q.quiz_options.map((o) => (
        <button key={o.id} className={`answer ${picked.includes(o.id) ? 'sel' : ''}`} aria-pressed={picked.includes(o.id)} onClick={() => toggle(o.id)}>{o.option_text}</button>))}
      {err && <p className="note error" role="alert">{err}</p>}
      <p><button className="btn" disabled={!picked.length || busy} onClick={() => (last ? submit() : setI(i + 1))}>
        {last ? (busy ? 'Submitting…' : 'Submit quiz') : <>Next question <ArrowRight aria-hidden="true" /></>}</button></p>
    </>
  );
}
