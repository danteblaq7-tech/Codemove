import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';

const when = (d) => new Date(d).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });   // NEW

export default function Course() {
  const { slug } = useParams();
  const [c, setC] = useState(null);
  const nav = useNavigate();
  const [code, setCode] = useState(''), [codeMsg, setCodeMsg] = useState('');   // NEW: class code box
  async function unlock(e) {
    e.preventDefault(); setCodeMsg('');
    try { const r = await api('/lessons/unlock', { method: 'POST', body: { code } }); nav(`/lessons/${r.lesson_id}`); }
    catch (x) { setCodeMsg(x.message); }
  }
  useEffect(() => { api(`/courses/${slug}`).then(setC).catch(() => {}); }, [slug]);
  if (!c) return <p>Loading…</p>;
  return (
    <>
      <Link to="/courses">← Back to courses</Link>
      <h1>{c.title}</h1><p className="muted">{c.description}</p>
      {/* NEW: learners type the code their teacher gives them to open a locked lesson */}
      <form className="card row codebar" onSubmit={unlock}>
        <label className="f" style={{ flex: 1 }}>🔑 Got a lesson code from your teacher?
          <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="e.g. K7M4QP" maxLength={12} autoCapitalize="characters" autoComplete="off" /></label>
        <button className="btn">Unlock</button>{codeMsg && <span className="note error" role="alert">{codeMsg}</span>}
      </form>
      {c.modules.map((m) => (
        <div className="card" key={m.id}>
          <h3>{m.title}</h3>
          <ul className="list">
            {m.lessons.map((l) => {
              // NEW: locked rows for learners
              if (l.locked === 'date') return <li key={l.id}><span className="dot">🔒</span><span className="muted">{l.title} · opens {when(l.release_at)}</span></li>;
              if (l.locked === 'teacher') return <li key={l.id}><span className="dot">🔒</span><span className="muted">{l.title} · waiting for your teacher to open it</span></li>;
              if (l.locked === 'code') return <li key={l.id}><span className="dot">🔑</span><Link to={`/lessons/${l.id}`}>{l.title}</Link><span className="muted"> · enter your teacher's code</span></li>;
              return (
                <li key={l.id}><span className={`dot ${l.status}`}>{l.status === 'completed' ? '✓' : ''}</span>
                  <Link to={`/lessons/${l.id}`}>{l.title}</Link><span className="muted"> · {l.estimated_minutes} min</span>
                  {/* teachers/admins only */}
                  {l.is_hidden && <span className="note" title="Only teachers and admins can see this lesson"> 🚫 hidden from learners</span>}
                  {!l.is_hidden && l.release_at && new Date(l.release_at) > new Date() && <span className="note"> ⏰ opens {when(l.release_at)}</span>}
                  {!l.is_hidden && l.requires_code && <span className="note"> {l.access_code ? `🔑 code ${l.access_code}` : '🔒 locked – no code issued'}</span>}
                </li>);
            })}
            {/* CHANGED: shows the learner's best score; ✓ once they have reached the pass mark */}
            {m.quizzes.map((q) => (
              <li key={q.id}><span className={`dot ${q.best_score >= q.pass_score ? 'completed' : ''}`}>{q.best_score >= q.pass_score ? '✓' : '?'}</span>
                <Link to={`/quizzes/${q.id}`}>Quiz: {q.title}</Link>
                <span className="muted"> · {q.best_score == null ? `pass mark ${q.pass_score}%` : `best ${q.best_score}% (pass mark ${q.pass_score}%)`}</span></li>))}
          </ul>
        </div>
      ))}
    </>
  );
}
