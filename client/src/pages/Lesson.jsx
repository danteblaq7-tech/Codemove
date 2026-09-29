import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { api } from '../api';
import Editor from '../components/Editor';

export default function Lesson() {
  const { id } = useParams();
  const nav = useNavigate();
  const [l, setL] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => { setL(null); api(`/lessons/${id}`).then(setL).catch((e) => setErr(e.message)); }, [id]);
  if (!l) return <p>{err || 'Loading…'}</p>;
  async function finish() {
    const r = await api(`/lessons/${id}/complete`, { method: 'POST' });
    if (r.badges.length) alert(`Badge earned: ${r.badges.join(', ')}`);
    nav(l.next_id ? `/lessons/${l.next_id}` : `/courses/${l.course_slug}`);
  }
  return (
    <div className="lesson">
      <Link to={`/courses/${l.course_slug}`}>← Back to course</Link>
      <h1>{l.title}</h1>
      <div className="panel" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(l.content || '') }} />
      {l.tip_text && <div className="tip">💡 <b>Remember</b><br />{l.tip_text}</div>}
      <Editor key={id} lessonId={id} initial={l.code_example || ''} />
      <button className="btn" onClick={finish}>Continue →</button>
    </div>
  );
}
