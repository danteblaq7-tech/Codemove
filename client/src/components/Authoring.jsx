// =====================================================================
// NEW FILE – client/src/components/Authoring.jsx
// Three building blocks used by the Admin and Teacher pages:
//   <NewCourse />   admin: create a course (starts as a hidden draft)
//   <NewLesson />   teacher/admin: pick course → module (or create one) → write the lesson
//   <BulkImport />  teacher/admin: paste or upload a student list and enrol it into cohorts
// =====================================================================
import { useEffect, useMemo, useState } from 'react';
import { api, useApi } from '../api';
import './Authoring.css';

/* ------------------------------------------------------------------ */
/*  NEW COURSE                                                         */
/* ------------------------------------------------------------------ */
export function NewCourse({ onDone }) {
  const blank = { title: '', description: '', difficulty_level: 'beginner', is_published: false };
  const [f, setF] = useState(blank), [msg, setMsg] = useState(''), [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  async function submit(e) {
    e.preventDefault(); setMsg(''); setErr(''); setBusy(true);
    try {
      await api('/admin/courses', { method: 'POST', body: f });
      setMsg(`Course "${f.title}" created${f.is_published ? '' : ' as a hidden draft – add lessons, then publish it above'}.`);
      setF(blank); onDone?.();
    } catch (x) { setErr(x.message); } finally { setBusy(false); }
  }
  return (
    <form className="card" onSubmit={submit}>
      <h3>Add a course</h3>
      {msg && <p className="note" role="status">{msg}</p>}{err && <p className="note error" role="alert">{err}</p>}
      <label className="f">Course title<input required minLength={3} maxLength={120} value={f.title} onChange={set('title')} placeholder="e.g. CSS for Beginners" /></label>
      <label className="f">Short description<textarea rows={3} maxLength={1000} value={f.description} onChange={set('description')} style={{ width: '100%' }} /></label>
      <div className="row">
        <label className="f">Level
          <select value={f.difficulty_level} onChange={set('difficulty_level')}>
            <option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option>
          </select></label>
        <label className="f"><input type="checkbox" checked={f.is_published} onChange={set('is_published')} style={{ width: 'auto' }} /> Publish immediately (learners can see it)</label>
      </div>
      <p><button className="btn" disabled={busy}>{busy ? 'Creating…' : 'Create course'}</button></p>
    </form>
  );
}

/* NEW: short cheat-sheet shown under the lesson notes box (replaces the old "HTML" instructions). */
export function NotesHelp() {
  return (
    <details className="notes-help">
      <summary>How to format notes (and add pictures / videos)</summary>
      <ul>
        <li>Press <b>Enter twice</b> for a new paragraph; once for a new line. Spacing is kept exactly as you type it.</li>
        <li><code>## Heading</code> makes a heading. Start lines with <code>- </code> for bullets or <code>1. </code> for numbers.</li>
        <li><code>**bold**</code>, <code>*italic*</code> and <code>`code`</code> work inside a sentence.</li>
        <li><b>Picture:</b> <code>[image: https://example.com/photo.jpg | Caption]</code></li>
        <li><b>Video:</b> <code>[video: https://www.youtube.com/watch?v=… | Watch the demo]</code></li>
        <li><b>Other link:</b> <code>[link: https://… | Link text]</code></li>
        <li>Leave the link empty, <code>[image: | Caption]</code>, to show a grey “picture coming soon” note until you have one.</li>
        <li>Table: one row per line, <code>| Name | Value |</code>; the first row is the header.</li>
      </ul>
    </details>
  );
}

/* ------------------------------------------------------------------ */
/*  NEW LESSON                                                         */
/* ------------------------------------------------------------------ */
export function NewLesson({ onDone }) {
  const [courses, reload, loadErr] = useApi('/staff/courses');
  const blank = { course_id: '', module_id: '', new_module: '', title: '', estimated_minutes: 10, content: '', code_example: '', tip_text: '' };
  const [f, setF] = useState(blank), [msg, setMsg] = useState(''), [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  if (!courses) return <p>{loadErr || 'Loading…'}</p>;
  if (!courses.length) return <div className="card">There are no courses yet. An admin needs to add a course first.</div>;
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const mods = courses.find((c) => c.id === f.course_id)?.modules || [];
  const pickCourse = (e) => {
    const c = courses.find((x) => x.id === e.target.value);
    setF({ ...f, course_id: e.target.value, module_id: c ? c.modules[0]?.id || '__new' : '' });   // a course with no modules goes straight to "new module"
  };
  async function submit(e) {
    e.preventDefault(); setMsg(''); setErr(''); setBusy(true);
    try {
      let module_id = f.module_id;
      if (module_id === '__new') {
        if (!f.new_module.trim()) throw new Error('Give the new module a name');
        module_id = (await api('/staff/modules', { method: 'POST', body: { course_id: f.course_id, title: f.new_module } })).id;
      }
      await api('/staff/lessons', { method: 'POST', body: { module_id, title: f.title, estimated_minutes: f.estimated_minutes,
        content: f.content, code_example: f.code_example, tip_text: f.tip_text } });
      setMsg(`Lesson "${f.title}" added to the end of the module.`);
      setF({ ...blank, course_id: f.course_id, module_id });     // keep course/module so you can add the next lesson quickly
      reload(); onDone?.();
    } catch (x) { setErr(x.message); } finally { setBusy(false); }
  }
  return (
    <form className="card" onSubmit={submit}>
      <h3>Add a lesson</h3>
      {msg && <p className="note" role="status">{msg}</p>}{err && <p className="note error" role="alert">{err}</p>}
      <div className="two">
        <label className="f">Course
          <select required value={f.course_id} onChange={pickCourse}>
            <option value="">Choose a course…</option>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.title}{c.is_published ? '' : ' (draft)'}</option>)}
          </select></label>
        <label className="f">Module (section)
          <select required disabled={!f.course_id} value={f.module_id} onChange={set('module_id')}>
            {mods.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
            <option value="__new">➕ New module…</option>
          </select></label>
      </div>
      {f.module_id === '__new' && <label className="f">New module name<input required maxLength={120} value={f.new_module} onChange={set('new_module')} /></label>}
      <div className="two">
        <label className="f">Lesson title<input required maxLength={160} value={f.title} onChange={set('title')} /></label>
        <label className="f">Estimated minutes<input type="number" min={1} max={240} value={f.estimated_minutes} onChange={set('estimated_minutes')} /></label>
      </div>
      <label className="f">Lesson notes (just type normally – no HTML)
        <textarea className="code notes" rows={14} value={f.content} onChange={set('content')} placeholder={'Explain the idea here. Press Enter twice to start a new paragraph.'} /></label>
      <NotesHelp />
      <label className="f">Starter code (what the learner sees in the editor)
        <textarea className="code" value={f.code_example} onChange={set('code_example')} placeholder={'<h1>Hello World</h1>\n<p>Welcome!</p>'} /></label>
      <label className="f">"Remember" tip (optional)<input maxLength={500} value={f.tip_text} onChange={set('tip_text')} /></label>
      <p><button className="btn" disabled={busy || !f.course_id}>{busy ? 'Saving…' : 'Add lesson'}</button></p>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/*  BULK STUDENT IMPORT                                                */
/* ------------------------------------------------------------------ */
const EMAIL = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;
const MAX_ROWS = 1000;

// Quote-aware split of one line ("Wanjiku, Amina",amina@x.com,"Cohort 1").
function splitLine(line, d) {
  const out = []; let cur = '', q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) { if (ch === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
    else if (ch === '"') q = true;
    else if (ch === d) { out.push(cur.trim()); cur = ''; }
    else cur += ch;
  }
  out.push(cur.trim());
  return out;
}

// Accepts CSV (comma or semicolon) and text pasted straight from Excel / Google Sheets (tabs).
// With a header row (name / email / cohort in any order) or without one (we find the email column).
export function parseStudents(text) {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).map((l, i) => ({ l, line: i + 1 })).filter((x) => x.l.trim());
  if (!lines.length) return [];
  const first = lines[0].l;
  const d = first.includes('\t') ? '\t' : first.split(';').length > first.split(',').length ? ';' : ',';
  const cells = lines.map((x) => ({ line: x.line, c: splitLine(x.l, d) }));
  const head = cells[0].c.map((c) => c.toLowerCase());
  const emailCol = head.findIndex((c) => c.includes('email'));
  if (emailCol >= 0) {                                                  // header row present
    const find = (keys) => head.findIndex((c, i) => i !== emailCol && keys.some((k) => c.includes(k)));
    const nameCol = find(['name', 'student', 'learner']), cohortCol = find(['cohort', 'class', 'group']);
    return cells.slice(1).map(({ line, c }) => ({ line, full_name: c[nameCol] || '', email: (c[emailCol] || '').toLowerCase(), cohort: c[cohortCol] || '' }));
  }
  return cells.map(({ line, c }) => {                                   // no header: the cell that looks like an email is the email
    const ei = c.findIndex((x) => EMAIL.test(x));
    const rest = c.filter((_, i) => i !== ei);
    return { line, full_name: rest[0] || '', email: (ei >= 0 ? c[ei] : c[0] || '').toLowerCase(), cohort: rest[1] || '' };
  });
}

function validate(rows) {
  const seen = new Set();
  return rows.map((r) => {
    let problem = '';
    if (!EMAIL.test(r.email)) problem = 'Invalid email';
    else { const k = `${r.email}|${r.cohort.toLowerCase()}`; if (seen.has(k)) problem = 'Duplicate in list'; seen.add(k); }
    return { ...r, problem };
  });
}

// Download helper. Cells starting with = + - @ are prefixed so Excel can't run them as formulas.
function downloadCsv(name, table) {
  const safe = (v) => { const s = String(v ?? ''); return `"${(/^[=+\-@\t\r]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`; };
  const url = URL.createObjectURL(new Blob(['\uFEFF' + table.map((r) => r.map(safe).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

const TAG = { created: ['Account created', ''], enrolled: ['Enrolled', ''], skipped: ['Skipped', 'warn'], error: ['Error', 'off'] };

// classes: [{id,name}]  isAdmin: may auto-create cohorts  defaultClassId: preselected cohort  onDone: refresh parent
export function BulkImport({ classes, isAdmin = false, defaultClassId = '', onDone }) {
  const [text, setText] = useState(''), [cls, setCls] = useState(defaultClassId || '');
  const [createMissing, setCreateMissing] = useState(false);
  const [busy, setBusy] = useState(false), [err, setErr] = useState(''), [report, setReport] = useState(null);
  useEffect(() => { setCls(defaultClassId || ''); }, [defaultClassId]);

  const rows = useMemo(() => validate(parseStudents(text)), [text]);
  const good = rows.filter((r) => !r.problem), bad = rows.filter((r) => r.problem);
  const known = new Set(classes.map((c) => c.name.trim().toLowerCase()));
  const missing = [...new Set(good.filter((r) => r.cohort && !known.has(r.cohort.toLowerCase())).map((r) => r.cohort))];
  const noCohort = good.filter((r) => !r.cohort && !cls).length;
  const blocker = !good.length ? '' : good.length > MAX_ROWS ? `Import up to ${MAX_ROWS} students at a time.`
    : noCohort ? `${noCohort} student(s) have no cohort – choose one above or add a cohort column.`
    : missing.length && !(isAdmin && createMissing) ? `Unknown cohort(s): ${missing.join(', ')}.${isAdmin ? ' Tick "Create missing cohorts" or fix the names.' : ' Ask an admin to create them or fix the names.'}` : '';

  async function submit() {
    setBusy(true); setErr(''); setReport(null);
    try {
      const r = await api('/staff/import-students', { method: 'POST', body: { default_class_id: cls || null, create_missing_cohorts: createMissing,
        rows: good.map(({ full_name, email, cohort }) => ({ full_name, email, cohort })) } });
      setReport(r); onDone?.();
    } catch (x) { setErr(x.message); } finally { setBusy(false); }
  }
  const reset = () => { setReport(null); setText(''); setErr(''); };
  const onFile = (e) => { const f = e.target.files?.[0]; if (f) f.text().then(setText); e.target.value = ''; };

  /* ---- result screen ---- */
  if (report) {
    const s = report.summary, made = report.results.filter((r) => r.password);
    return (
      <div className="card imp">
        <h3>Import finished</h3>
        <div className="imp-sum">
          <span className="tag">{s.created} accounts created</span><span className="tag">{s.enrolled} existing learners enrolled</span>
          {s.skipped > 0 && <span className="tag warn">{s.skipped} skipped</span>}{s.errors > 0 && <span className="tag off">{s.errors} errors</span>}
        </div>
        {made.length > 0 && (
          <p className="note">⚠ Temporary passwords are shown <b>only now</b>. Download them and share each one privately – they can't be viewed again
            (an admin can reset a password later under Users).{' '}
            <button className="btn sm" onClick={() => downloadCsv('new-student-logins.csv', [['full_name', 'email', 'cohort', 'temporary_password'], ...made.map((r) => [r.full_name, r.email, r.cohort, r.password])])}>Download logins (CSV)</button></p>
        )}
        <div className="scroll imp-scroll"><table>
          <thead><tr><th>#</th><th>Email</th><th>Cohort</th><th>Result</th></tr></thead>
          <tbody>{report.results.map((r) => (
            <tr key={r.row}><td>{r.row}</td><td>{r.email}</td><td>{r.cohort || '—'}</td>
              <td><span className={`tag ${TAG[r.status]?.[1] || ''}`}>{TAG[r.status]?.[0] || r.status}</span> {r.message}</td></tr>))}</tbody>
        </table></div>
        <p>
          <button className="btn ghost sm" onClick={() => downloadCsv('import-report.csv', [['row', 'email', 'cohort', 'result', 'message'], ...report.results.map((r) => [r.row, r.email, r.cohort, r.status, r.message])])}>Download full report</button>{' '}
          <button className="btn sm" onClick={reset}>Import another list</button>
        </p>
      </div>
    );
  }

  /* ---- input screen ---- */
  return (
    <div className="card imp">
      <h3>Bulk add students</h3>
      <p className="muted">Paste a list (or upload a CSV). Columns: <b>full_name, email, cohort</b>. Copying straight from Excel or Google Sheets works.
        New emails get an account with a temporary password; existing learners are just enrolled.{' '}
        <button className="linkbtn" onClick={() => downloadCsv('student-import-template.csv', [['full_name', 'email', 'cohort'], ['Amina Wanjiku', 'amina@example.com', classes[0]?.name || 'Cohort 1']])}>Download template</button></p>
      {err && <p className="note error" role="alert">{err}</p>}
      <div className="two">
        <label className="f">Add to cohort
          <select value={cls} onChange={(e) => setCls(e.target.value)}>
            <option value="">— Use the cohort column in my list —</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select></label>
        <label className="f">…or upload a file<input type="file" accept=".csv,.tsv,.txt" onChange={onFile} /></label>
      </div>
      <label className="f">Student list
        <textarea value={text} onChange={(e) => setText(e.target.value)} spellCheck={false}
          placeholder={'full_name,email,cohort\nAmina Wanjiku,amina@example.com,Cohort 1\nBrian Otieno,brian@example.com,Cohort 2'} /></label>
      {isAdmin && <label className="f"><input type="checkbox" checked={createMissing} onChange={(e) => setCreateMissing(e.target.checked)} style={{ width: 'auto' }} /> Create cohorts that don't exist yet</label>}

      {rows.length > 0 && (
        <>
          <div className="imp-sum">
            <span className="tag">{good.length} ready</span>
            {bad.length > 0 && <span className="tag off">{bad.length} with problems (will be skipped)</span>}
          </div>
          <div className="scroll imp-scroll"><table>
            <thead><tr><th>Line</th><th>Name</th><th>Email</th><th>Cohort</th><th></th></tr></thead>
            <tbody>{rows.slice(0, 50).map((r) => (
              <tr key={r.line}><td>{r.line}</td><td>{r.full_name || <span className="muted">from email</span>}</td><td>{r.email}</td>
                <td>{r.cohort || (cls ? classes.find((c) => c.id === cls)?.name : <span className="muted">—</span>)}</td>
                <td>{r.problem && <span className="tag off">{r.problem}</span>}</td></tr>))}</tbody>
          </table></div>
          {rows.length > 50 && <p className="muted">Showing the first 50 of {rows.length} rows.</p>}
        </>
      )}
      {blocker && <p className="note error">{blocker}</p>}
      <p><button className="btn" disabled={busy || !good.length || !!blocker} onClick={submit}>
        {busy ? 'Importing… this can take a minute' : `Import ${good.length || ''} student${good.length === 1 ? '' : 's'}`}</button></p>
    </div>
  );
}
