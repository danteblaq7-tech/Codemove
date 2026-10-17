import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Check, CircleHelp } from 'lucide-react';
import { api } from '../api';

export default function Course() {
  const { slug } = useParams();
  const [c, setC] = useState(null);
  useEffect(() => { api(`/courses/${slug}`).then(setC).catch(() => {}); }, [slug]);
  if (!c) return <p>Loading…</p>;
  return (
    <>
      <Link className="icon-link" to="/courses"><ArrowLeft aria-hidden="true" />Back to courses</Link>
      <h1>{c.title}</h1><p className="muted">{c.description}</p>
      {c.modules.map((m) => (
        <div className="card" key={m.id}>
          <h3>{m.title}</h3>
          <ul className="list">
            {m.lessons.map((l) => (
              <li key={l.id}><span className={`dot ${l.status}`}>{l.status === 'completed' && <Check aria-hidden="true" />}</span>
                <Link to={`/lessons/${l.id}`}>{l.title}</Link><span className="muted"> · {l.estimated_minutes} min</span></li>
            ))}
            {/* Shows the learner's best score once they have reached the pass mark. */}
            {m.quizzes.map((q) => (
              <li key={q.id}><span className={`dot ${q.best_score >= q.pass_score ? 'completed' : ''}`}>
                {q.best_score >= q.pass_score ? <Check aria-hidden="true" /> : <CircleHelp aria-hidden="true" />}
              </span>
                <Link to={`/quizzes/${q.id}`}>Quiz: {q.title}</Link>
                <span className="muted"> · {q.best_score == null ? `pass mark ${q.pass_score}%` : `best ${q.best_score}% (pass mark ${q.pass_score}%)`}</span></li>))}
          </ul>
        </div>
      ))}
    </>
  );
}
