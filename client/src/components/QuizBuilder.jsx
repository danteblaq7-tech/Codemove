// =====================================================================
// NEW FILE – client/src/components/QuizBuilder.jsx
//   <QuizManager isAdmin />   list of all quizzes + "New quiz" + edit (+ delete for admins)
// Used in the Teacher portal ("Quizzes" tab) and the Admin console ("Quizzes" tab).
// Questions can be built with the form, or pasted in bulk ("Quick paste") – see parseQuizText.
// The server re-validates everything; the messages it returns ("Question 3: …") are shown as-is.
// =====================================================================
import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, ArrowDown, ArrowLeft, ArrowUp, ClipboardPaste, Plus, X } from 'lucide-react';
import { api, useApi } from '../api';
import './Assessment.css';

let uid = 0;
const key = () => `k${++uid}`;                                   // stable React keys so inputs keep focus when items move
const opt = (text = '', ok = false) => ({ _k: key(), option_text: text, is_correct: ok });
const question = (text = '', type = 'single', options) => ({ _k: key(), question_text: text, question_type: type, options: options || [opt(), opt(), opt(), opt()] });

/* "Quick paste" format – blank line between questions, * = correct answer, - = wrong answer:

   Which tag makes the main heading?
   - <p>
   * <h1>
   - <div>
*/
export function parseQuizText(text) {
  return text.replace(/\r/g, '').split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean).map((block) => {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    const isOpt = (l) => /^[*-]\s*\S/.test(l);
    const stem = lines.filter((l) => !isOpt(l)).join(' ').replace(/^(\d+[.)]|Q\d*[.:)])\s*/i, '');
    const options = lines.filter(isOpt).map((l) => opt(l.replace(/^[*-]\s*/, ''), l.startsWith('*')));
    return question(stem, options.filter((o) => o.is_correct).length > 1 ? 'multiple' : 'single', options);
  });
}

/* ------------------------------------------------------------------ */
export function QuizManager({ isAdmin = false }) {
  const [list, reload, err] = useApi('/staff/quizzes');
  const [editing, setEditing] = useState(null);                // null = list · 'new' · quiz id
  const [notice, setNotice] = useState(''), [delErr, setDelErr] = useState('');

  if (editing) return <QuizEditor id={editing === 'new' ? null : editing}
    onClose={(msg) => { setEditing(null); if (msg) { setNotice(msg); reload(); } }} />;

  async function remove(q) {
    if (!window.confirm(`Delete "${q.title}"?\n\nThis also deletes every learner's attempts on it, which changes their grades. This cannot be undone.`)) return;
    setDelErr('');
    try { await api(`/admin/quizzes/${q.id}`, { method: 'DELETE' }); setNotice(`Deleted "${q.title}".`); reload(); }
    catch (e) { setDelErr(e.message); }
  }

  return (
    <>
      <p><button className="btn" onClick={() => { setNotice(''); setEditing('new'); }}><Plus aria-hidden="true" />New quiz</button></p>
      {notice && <p className="note" role="status">{notice}</p>}{delErr && <p className="note error" role="alert">{delErr}</p>}
      {!list ? <p className={err ? 'note error' : ''}>{err || 'Loading…'}</p> : !list.length ? <div className="card">No quizzes yet. Create the first one!</div> : (
        <div className="card scroll"><table>
          <thead><tr><th>Quiz</th><th>Course › module</th><th>Questions</th><th>Pass mark</th><th>Visible to learners</th><th></th></tr></thead>
          <tbody>{list.map((q) => (
            <tr key={q.id}><td>{q.title}</td><td>{q.course} › {q.module}</td><td>{q.questions}</td><td>{q.pass_score}%</td>
              <td><span className={`tag ${q.published ? '' : 'off'}`}>{q.published ? 'Yes' : 'No – course is a draft'}</span></td>
              <td><button className="btn ghost sm" onClick={() => { setNotice(''); setEditing(q.id); }}>Edit</button>{' '}
                {isAdmin && <button className="btn danger sm" onClick={() => remove(q)}>Delete</button>}</td></tr>))}</tbody>
        </table></div>)}
    </>
  );
}

/* ------------------------------------------------------------------ */
function QuizEditor({ id, onClose }) {
  const [courses, , cErr] = useApi('/staff/courses');
  const [meta, setMeta] = useState({ course_id: '', module_id: '', title: '', description: '', pass_score: 70 });
  const [qs, setQs] = useState(() => [question()]);
  const [attempts, setAttempts] = useState(0), [loaded, setLoaded] = useState(!id);
  const [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  const [paste, setPaste] = useState(''), [showPaste, setShowPaste] = useState(false);
  const top = useRef(null);

  useEffect(() => {                                              // editing: load the quiz with its answers
    if (!id) return;
    api(`/staff/quizzes/${id}`).then((q) => {
      setMeta({ course_id: q.course_id || '', module_id: q.module_id || '', title: q.title, description: q.description, pass_score: q.pass_score });
      setQs(q.questions.map((x) => question(x.question_text, x.question_type, x.options.map((o) => opt(o.option_text, o.is_correct)))));
      setAttempts(q.attempts); setLoaded(true);
    }).catch((e) => setErr(e.message));
  }, [id]);

  const mods = courses?.find((c) => c.id === meta.course_id)?.modules || [];
  const setM = (k) => (e) => setMeta({ ...meta, [k]: e.target.value });
  const upQ = (i, patch) => setQs(qs.map((q, k) => (k === i ? { ...q, ...patch } : q)));
  const upO = (i, j, patch) => upQ(i, { options: qs[i].options.map((o, k) => (k === j ? { ...o, ...patch } : o)) });
  const move = (i, d) => { const k = i + d; if (k < 0 || k >= qs.length) return; const c = [...qs]; [c[i], c[k]] = [c[k], c[i]]; setQs(c); };

  function setType(i, type) {                                    // single → keep at most one correct answer
    let options = qs[i].options;
    if (type === 'single') { let seen = false; options = options.map((o) => { const keep = o.is_correct && !seen; seen = seen || o.is_correct; return { ...o, is_correct: keep }; }); }
    upQ(i, { question_type: type, options });
  }
  function toggleCorrect(i, j) {
    const q = qs[i];
    upQ(i, { options: q.options.map((o, k) => (q.question_type === 'single' ? { ...o, is_correct: k === j } : k === j ? { ...o, is_correct: !o.is_correct } : o)) });
  }
  const addPasted = () => { const add = parseQuizText(paste); if (!add.length) return; setQs([...qs.filter((q) => q.question_text.trim() || q.options.some((o) => o.option_text.trim())), ...add]); setPaste(''); setShowPaste(false); };

  async function save(e) {
    e.preventDefault(); setErr(''); setBusy(true);
    const body = { ...meta, questions: qs.map((q) => ({ question_text: q.question_text, question_type: q.question_type,
      options: q.options.map((o) => ({ option_text: o.option_text, is_correct: o.is_correct })) })) };
    try {
      await api(id ? `/staff/quizzes/${id}` : '/staff/quizzes', { method: id ? 'PUT' : 'POST', body });
      onClose(`Quiz "${meta.title}" ${id ? 'updated' : 'created'}.`);
    } catch (x) { setErr(x.message); top.current?.scrollIntoView?.({ behavior: 'smooth' }); } finally { setBusy(false); }
  }

  if (!loaded) return <p className={err ? 'note error' : ''}>{err || 'Loading…'}</p>;
  if (!courses) return <p className={cErr ? 'note error' : ''}>{cErr || 'Loading…'}</p>;

  return (
    <form onSubmit={save} className="quiz-editor">
      <div ref={top} />
      <p><button type="button" className="btn ghost sm" onClick={() => onClose()}><ArrowLeft aria-hidden="true" />Back to quizzes</button></p>
      <h2>{id ? 'Edit quiz' : 'New quiz'}</h2>
      {err && <p className="note error" role="alert">{err}</p>}
      {attempts > 0 && <p className="note"><AlertTriangle className="inline-icon" aria-hidden="true" /> Learners have made {attempts} attempt{attempts === 1 ? '' : 's'} on this quiz. Their scores (and grades) are kept, but the per-question details of those attempts are cleared when you save. Changing which answers are correct will not re-grade old attempts.</p>}

      <div className="card">
        <div className="two">
          <label className="f">Course
            <select required value={meta.course_id} onChange={(e) => { const c = courses.find((x) => x.id === e.target.value); setMeta({ ...meta, course_id: e.target.value, module_id: c?.modules[0]?.id || '' }); }}>
              <option value="">Choose a course…</option>
              {courses.map((c) => <option key={c.id} value={c.id}>{c.title}{c.is_published ? '' : ' (draft)'}</option>)}</select></label>
          <label className="f">Module (where learners find it)
            <select required disabled={!meta.course_id} value={meta.module_id} onChange={setM('module_id')}>
              {!mods.length && <option value="">This course has no modules yet</option>}
              {mods.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}</select></label>
        </div>
        <div className="two">
          <label className="f">Quiz title<input required maxLength={160} value={meta.title} onChange={setM('title')} placeholder="e.g. HTML basics check" /></label>
          <label className="f">Pass mark (%)<input type="number" min={1} max={100} required value={meta.pass_score} onChange={setM('pass_score')} /></label>
        </div>
        <label className="f">Short description (optional)<input maxLength={500} value={meta.description} onChange={setM('description')} /></label>
      </div>

      {qs.map((q, i) => (
        <fieldset className="card qcard" key={q._k}>
          <legend>Question {i + 1}</legend>
          <div className="qtools">
            <button type="button" className="btn ghost sm" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move question ${i + 1} up`}><ArrowUp aria-hidden="true" /></button>
            <button type="button" className="btn ghost sm" onClick={() => move(i, 1)} disabled={i === qs.length - 1} aria-label={`Move question ${i + 1} down`}><ArrowDown aria-hidden="true" /></button>
            <button type="button" className="btn danger sm" onClick={() => setQs(qs.filter((_, k) => k !== i))} disabled={qs.length === 1} aria-label={`Delete question ${i + 1}`}><X aria-hidden="true" /></button>
          </div>
          <label className="f">Question
            <textarea rows={2} maxLength={500} value={q.question_text} onChange={(e) => upQ(i, { question_text: e.target.value })} style={{ width: '100%' }} /></label>
          <label className="f">Answer type
            <select value={q.question_type} onChange={(e) => setType(i, e.target.value)}>
              <option value="single">One correct answer</option><option value="multiple">Several correct answers</option></select></label>
          <p className="muted">{q.question_type === 'single' ? 'Select the one correct answer.' : 'Tick every correct answer. Learners must pick all of them (and nothing else) to score the point.'}</p>
          {q.options.map((o, j) => (
            <div className="optrow" key={o._k}>
              <input type={q.question_type === 'single' ? 'radio' : 'checkbox'} name={`correct-${q._k}`} checked={o.is_correct}
                onChange={() => toggleCorrect(i, j)} aria-label={`Option ${j + 1} is correct`} />
              <input type="text" maxLength={300} value={o.option_text} placeholder={`Answer ${j + 1}`} aria-label={`Answer ${j + 1} text`}
                onChange={(e) => upO(i, j, { option_text: e.target.value })} />
              <button type="button" className="btn ghost sm" disabled={q.options.length <= 2} aria-label={`Remove answer ${j + 1}`}
                onClick={() => upQ(i, { options: q.options.filter((_, k) => k !== j) })}><X aria-hidden="true" /></button>
            </div>))}
          <button type="button" className="btn ghost sm" disabled={q.options.length >= 8} onClick={() => upQ(i, { options: [...q.options, opt()] })}><Plus aria-hidden="true" />Add answer</button>
        </fieldset>))}

      <p className="row">
        <button type="button" className="btn ghost" disabled={qs.length >= 50} onClick={() => setQs([...qs, question()])}><Plus aria-hidden="true" />Add question</button>
        <button type="button" className="btn ghost" onClick={() => setShowPaste(!showPaste)}><ClipboardPaste aria-hidden="true" />Quick paste</button>
      </p>
      {showPaste && (
        <div className="card">
          <p className="muted">One question per block, blank line between blocks. Start the correct answer(s) with <b>*</b> and wrong answers with <b>-</b>.</p>
          <textarea className="code" rows={9} style={{ width: '100%' }} value={paste} onChange={(e) => setPaste(e.target.value)} spellCheck={false}
            placeholder={'Which tag makes the main heading?\n- <p>\n* <h1>\n- <div>\n\nWhich are list tags?\n* <ul>\n* <ol>\n- <img>'} />
          <p><button type="button" className="btn" disabled={!paste.trim()} onClick={addPasted}>Add {parseQuizText(paste).length || ''} question(s)</button></p>
        </div>)}

      <p className="sticky-save">
        <button className="btn" disabled={busy}>{busy ? 'Saving…' : id ? 'Save changes' : 'Create quiz'}</button>{' '}
        <span className="muted">{qs.length} question{qs.length === 1 ? '' : 's'}</span>
      </p>
    </form>
  );
}
