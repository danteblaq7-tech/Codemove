import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Clock3, EyeOff, KeyRound, Lightbulb, LockKeyhole } from 'lucide-react';
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
  const [code, setCode] = useState('');   // NEW: class code typed on a locked lesson
  async function unlock(e) {
    e.preventDefault(); setErr('');
    try { await api('/lessons/unlock', { method: 'POST', body: { code } }); setL(null); api(`/lessons/${id}`).then(setL).catch((x) => setErr(x.message)); }
    catch (x) { setErr(x.message); }
  }
  useEffect(() => { setL(null); setErr(''); api(`/lessons/${id}`).then(setL).catch((e) => setErr(e.message)); }, [id]);
  const unreleased = l && !l.locked && (l.is_hidden || (l.release_at && new Date(l.release_at) > new Date()) || (l.requires_code && !l.access_code));   // NEW: hidden, scheduled or waiting for a code (staff preview)
  if (!l) return err
    ? <div><p className="note error" role="alert">{err}</p><Link className="icon-link" to="/courses"><ArrowLeft aria-hidden="true" />Back to courses</Link></div>   // CHANGED: a hidden / unknown lesson gets a way back
    : <p>Loading…</p>;
  // NEW: a locked lesson shows why, and a code box when a class code is what's needed
  if (l.locked) {
    return (
      <div className="lesson">
        <Link className="icon-link" to={`/courses/${l.course_slug}`}><ArrowLeft aria-hidden="true" />Back to course</Link>
        <h1>{l.title}</h1>
        {l.locked === 'code' && (
          <form className="card" onSubmit={unlock}>
            <p><KeyRound className="inline-icon" aria-hidden="true" /> <b>This lesson needs a class code.</b> Your teacher will give it to you in class.</p>
            <div className="row"><input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="e.g. K7M4QP" maxLength={12} autoComplete="off" required />
              <button className="btn">Unlock lesson</button></div>
            {err && <p className="note error" role="alert">{err}</p>}
          </form>)}
        {l.locked === 'teacher' && <p className="note"><LockKeyhole className="inline-icon" aria-hidden="true" /> Your teacher has not opened this lesson yet. Check back soon.</p>}
        {l.locked === 'date' && <p className="note"><Clock3 className="inline-icon" aria-hidden="true" /> This lesson opens on {new Date(l.release_at).toLocaleString()}.</p>}
      </div>
    );
  }
  async function finish() {
    try {   // CHANGED: errors are shown instead of silently doing nothing
      // NEW: a teacher previewing a hidden lesson just moves on; nothing is recorded.
      const r = unreleased ? { badges: [] } : await api(`/lessons/${id}/complete`, { method: 'POST' });
      if (r.badges.length) alert(`Badge earned: ${r.badges.join(', ')}`);
      nav(l.next_id ? `/lessons/${l.next_id}` : `/courses/${l.course_slug}`);
    } catch (e) { setErr(e.message); }
  }
  return (
    <div className="lesson">
      <Link className="icon-link" to={`/courses/${l.course_slug}`}><ArrowLeft aria-hidden="true" />Back to course</Link>
      <h1>{l.title}</h1>
      {unreleased && <p className="note">{l.is_hidden
        ? <><EyeOff className="inline-icon" aria-hidden="true" /> This lesson is hidden from learners.</>
        : l.requires_code && !l.access_code
          ? <><LockKeyhole className="inline-icon" aria-hidden="true" /> This lesson is locked for learners until you issue a class code.</>
          : <><Clock3 className="inline-icon" aria-hidden="true" /> This lesson is locked for learners until {new Date(l.release_at).toLocaleString()}.</>} You can see it because you are a teacher/admin.</p>}
      {!unreleased && l.requires_code && l.access_code && <p className="note"><KeyRound className="inline-icon" aria-hidden="true" /> Learners open this lesson with the code <b>{l.access_code}</b>.</p>}
      <div className="panel" dangerouslySetInnerHTML={{ __html: clean(l.content) }} />
      {l.tip_text && <div className="tip"><Lightbulb className="inline-icon" aria-hidden="true" /> <b>Remember</b><br />{l.tip_text}</div>}
      {/* CHANGED: Codesters-style workspace. `starter` = lesson's example code, `saved` = this learner's own saved work. */}
      {/* CHANGED: the code workspace only appears on code-lab lessons (those with starter code, or saved work).
          Concept and hands-on robotics lessons have no code to write, so they show just the lesson text. */}
      {(l.code_example || l.saved_code != null) && <Editor key={id} lessonId={id} starter={l.code_example || ''} saved={l.saved_code} />}
      {err && <p className="note error" role="alert">{err}</p>}
      <button className="btn icon-link" onClick={finish}>Continue <ArrowRight aria-hidden="true" /></button>
    </div>
  );
}
