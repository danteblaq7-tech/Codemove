import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { api } from '../api';
import Editor from '../components/Editor';

// NEW: lesson links (pictures/videos) open in a new tab; DOMPurify drops `target` unless we allow it.
DOMPurify.addHook('afterSanitizeAttributes', (n) => { if (n.tagName === 'A' && n.getAttribute('target')) n.setAttribute('rel', 'noopener noreferrer'); });
const clean = (html) => DOMPurify.sanitize(html || '', { ADD_ATTR: ['target'] });

export default function Lesson() {
  const { id } = useParams();
  const nav = useNavigate();
  const [l, setL] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => { setL(null); setErr(''); api(`/lessons/${id}`).then(setL).catch((e) => setErr(e.message)); }, [id]);
  if (!l) return <p className={err ? 'note error' : ''}>{err || 'Loading…'}</p>;
  async function finish() {
    try {   // CHANGED: errors are shown instead of silently doing nothing
      const r = await api(`/lessons/${id}/complete`, { method: 'POST' });
      if (r.badges.length) alert(`Badge earned: ${r.badges.join(', ')}`);
      nav(l.next_id ? `/lessons/${l.next_id}` : `/courses/${l.course_slug}`);
    } catch (e) { setErr(e.message); }
  }
  return (
    <div className="lesson">
      <Link to={`/courses/${l.course_slug}`}>← Back to course</Link>
      <h1>{l.title}</h1>
      <div className="panel" dangerouslySetInnerHTML={{ __html: clean(l.content) }} />
      {l.tip_text && <div className="tip">💡 <b>Remember</b><br />{l.tip_text}</div>}
      {/* CHANGED: Codesters-style workspace. `starter` = lesson's example code, `saved` = this learner's own saved work. */}
      {/* CHANGED: the code workspace only appears on code-lab lessons (those with starter code, or saved work).
          Concept and hands-on robotics lessons have no code to write, so they show just the lesson text. */}
      {(l.code_example || l.saved_code != null) && <Editor key={id} lessonId={id} starter={l.code_example || ''} saved={l.saved_code} />}
      {err && <p className="note error" role="alert">{err}</p>}
      <button className="btn" onClick={finish}>Continue →</button>
    </div>
  );
}
