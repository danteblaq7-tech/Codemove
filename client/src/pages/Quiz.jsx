import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';

export default function Quiz() {
  const { id } = useParams();
  const [quiz, setQuiz] = useState(null);
  const [i, setI] = useState(0);
  const [ans, setAns] = useState({});
  const [result, setResult] = useState(null);
  useEffect(() => { api(`/quizzes/${id}`).then(setQuiz).catch(() => {}); }, [id]);
  if (!quiz) return <p>Loading…</p>;
  if (result) return (
    <div className="card"><h1>{result.passed ? '🎉 You passed!' : 'Not quite yet'}</h1>
      <p>Score: <b>{result.score}%</b> ({result.correct} of {result.total} correct). Pass mark: {result.passScore}%.</p>
      <button className="btn" onClick={() => { setResult(null); setAns({}); setI(0); }}>Try again</button>{' '}
      <Link className="btn ghost" to="/courses">Back to courses</Link></div>);
  const qs = quiz.quiz_questions, q = qs[i], picked = ans[q.id] || [];
  const toggle = (oid) => setAns({ ...ans, [q.id]: q.question_type === 'multiple'
    ? (picked.includes(oid) ? picked.filter((x) => x !== oid) : [...picked, oid]) : [oid] });
  const last = i === qs.length - 1;
  return (
    <>
      <h1>{quiz.title}</h1>
      <p className="muted">Question {i + 1} of {qs.length}</p>
      <div className="bar"><i style={{ width: `${((i + 1) / qs.length) * 100}%` }} /></div>
      <h2>{q.question_text}</h2>
      {q.quiz_options.map((o) => (
        <button key={o.id} className={`answer ${picked.includes(o.id) ? 'sel' : ''}`} onClick={() => toggle(o.id)}>{o.option_text}</button>))}
      <p><button className="btn" disabled={!picked.length}
        onClick={() => last ? api(`/quizzes/${id}/submit`, { method: 'POST', body: { answers: ans } }).then(setResult) : setI(i + 1)}>
        {last ? 'Submit quiz' : 'Next question →'}</button></p>
    </>
  );
}
