import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';

export default function Course() {
  const { slug } = useParams();
  const [c, setC] = useState(null);
  useEffect(() => { api(`/courses/${slug}`).then(setC).catch(() => {}); }, [slug]);
  if (!c) return <p>Loading…</p>;
  return (
    <>
      <Link to="/courses">← Back to courses</Link>
      <h1>{c.title}</h1><p className="muted">{c.description}</p>
      {c.modules.map((m) => (
        <div className="card" key={m.id}>
          <h3>{m.title}</h3>
          <ul className="list">
            {m.lessons.map((l) => (
              <li key={l.id}><span className={`dot ${l.status}`}>{l.status === 'completed' ? '✓' : ''}</span>
                <Link to={`/lessons/${l.id}`}>{l.title}</Link><span className="muted"> · {l.estimated_minutes} min</span></li>
            ))}
            {m.quizzes.map((q) => <li key={q.id}><span className="dot">?</span><Link to={`/quizzes/${q.id}`}>Quiz: {q.title}</Link></li>)}
          </ul>
        </div>
      ))}
    </>
  );
}
