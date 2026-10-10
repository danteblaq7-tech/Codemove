import { useEffect, useMemo, useState } from 'react';
import { Navigate, useOutletContext } from 'react-router-dom';
import { api, useApi } from '../../api';
import Tabs from '../../components/Tabs';
import Account from '../../components/Account';
import { BulkImport, NewLesson, NotesHelp } from '../../components/Authoring'; // NEW
import Rankings from '../../components/Rankings';       // NEW: graded ranking of your learners
import { QuizManager } from '../../components/QuizBuilder'; // NEW: add / edit quizzes

export default function Teacher() {
  const { me } = useOutletContext();
  const [tab, setTab] = useState('classes');
  if (!me) return <p>Loading…</p>;
  if (!['teacher', 'admin'].includes(me.role)) return <Navigate to="/" />;
  return (
    <>
      <h1>Teacher portal</h1>
      <p className="muted">Signed in as {me.full_name} ({me.email})</p>
      {/* CHANGED: new "Rankings" and "Quizzes" tabs */}
      <Tabs tabs={[['classes', 'My classes'], ['rankings', 'Rankings'], ['lessons', 'Edit lessons'], ['quizzes', 'Quizzes'], ['account', 'My account']]} value={tab} onChange={setTab} />
      {tab === 'classes' && <Classes />}{tab === 'rankings' && <Rankings isAdmin={me.role === 'admin'} />}{tab === 'lessons' && <Lessons />}
      {tab === 'quizzes' && <QuizManager isAdmin={me.role === 'admin'} />}{tab === 'account' && <Account />}
    </>
  );
}

function Classes() {
  const { me } = useOutletContext();                       // NEW: admins opening this page may also create cohorts
  const [list, reload, err] = useApi('/staff/classes');    // CHANGED: keep `reload` so counts refresh after an import
  const [sel, setSel] = useState(null), [tick, setTick] = useState(0);
  useEffect(() => { if (list?.length && !sel) setSel(list[0].id); }, [list, sel]);
  if (err) return <p className="note error">{err}</p>;
  if (!list) return <p>Loading…</p>;
  if (!list.length) return <div className="card">No classes are assigned to you yet. Ask an admin to assign one.</div>;
  return (
    <>
      <div className="chips">{list.map((c) => (
        <button key={c.id} className="tab" aria-selected={sel === c.id} onClick={() => setSel(c.id)}>{c.name} ({c.learners})</button>))}</div>
      {sel && <Roster key={`${sel}-${tick}`} id={sel} />}
      {/* NEW: bulk-add students to the selected cohort (or use a cohort column – teachers: your own cohorts only) */}
      <BulkImport classes={list} isAdmin={me?.role === 'admin'} defaultClassId={sel || ''} onDone={() => { reload(); setTick((t) => t + 1); }} />
    </>
  );
}

function Roster({ id }) {
  const [d, load] = useApi(`/staff/classes/${id}/progress`);
  const [email, setEmail] = useState(''), [msg, setMsg] = useState('');
  if (!d) return <p>Loading…</p>;
  const avg = d.learners.length ? Math.round(d.learners.reduce((a, l) => a + l.percent, 0) / d.learners.length) : 0;
  async function add(e) {
    e.preventDefault(); setMsg('');
    try { await api(`/staff/classes/${id}/members`, { method: 'POST', body: { email } }); setEmail(''); load(); }
    catch (x) { setMsg(x.message); }
  }
  const remove = async (uid) => { await api(`/staff/classes/${id}/members/${uid}`, { method: 'DELETE' }); load(); };
  return (
    <>
      <div className="grid stats">
        <div className="card"><b>{d.learners.length}</b><span className="muted">Learners</span></div>
        <div className="card"><b>{avg}%</b><span className="muted">Average complete</span></div>
        <div className="card"><b>{d.learners.filter((l) => !l.completed).length}</b><span className="muted">Not started</span></div>
      </div>
      <div className="card scroll"><table>
        <thead><tr><th>Learner</th><th>Email</th><th>Lessons</th><th>Progress</th><th></th></tr></thead>
        <tbody>{d.learners.map((l) => (
          <tr key={l.id}><td>{l.full_name}</td><td>{l.email}</td><td>{l.completed} of {d.total}</td>
            <td><span className="meter"><i style={{ width: `${l.percent}%` }} /></span>{l.percent}%</td>
            <td><button className="btn ghost sm" onClick={() => remove(l.id)}>Remove</button></td></tr>))}</tbody>
      </table></div>
      <form className="card row" onSubmit={add}>
        <label className="f" style={{ flex: 1 }}>Add a learner by email<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <button className="btn">Add learner</button>{msg && <span className="note error">{msg}</span>}
      </form>
    </>
  );
}

function Lessons() {
  const [raw, load, err] = useApi('/staff/lessons');
  // NEW: group by course → module → order, so lessons you add appear next to their siblings.
  const list = useMemo(() => raw && [...raw].sort((a, b) =>
    `${a.modules.courses.title}|${a.modules.title}`.localeCompare(`${b.modules.courses.title}|${b.modules.title}`) || (a.order_index ?? 0) - (b.order_index ?? 0)), [raw]);
  const [i, setI] = useState(0), [f, setF] = useState(null), [msg, setMsg] = useState(''), [adding, setAdding] = useState(false);
  useEffect(() => { if (list?.[i]) setF({ ...list[i] }); }, [list, i]);
  if (!list) return <p>{err || 'Loading…'}</p>;
  if (!list.length) return <NewLesson onDone={load} />;      // NEW: nothing to edit yet → go straight to adding
  if (!f) return <p>Loading…</p>;
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  async function save() {
    await api(`/staff/lessons/${f.id}`, { method: 'PATCH', body: { title: f.title, content: f.content, code_example: f.code_example, tip_text: f.tip_text } });
    setMsg('Lesson saved'); load();
  }
  return (
    <>
    {/* NEW: add a lesson to any course/module */}
    <p><button className="btn ghost" onClick={() => setAdding(!adding)}>{adding ? 'Close' : '➕ New lesson'}</button></p>
    {adding && <NewLesson onDone={load} />}
    <div className="split">
      <div className="card">{list.map((l, k) => (
        <button key={l.id} className="tab full" aria-selected={k === i} onClick={() => { setI(k); setMsg(''); }}>{l.modules.courses.title}: {l.title}</button>))}</div>
      <div className="card">
        <label className="f">Title<input value={f.title} onChange={set('title')} /></label>
        <label className="f">Lesson notes (just type normally – no HTML)
          <textarea className="code notes" rows={18} value={f.content || ''} onChange={set('content')} /></label>
        <NotesHelp />
        <label className="f">Starter code<textarea className="code" value={f.code_example || ''} onChange={set('code_example')} /></label>
        <label className="f">Tip<input value={f.tip_text || ''} onChange={set('tip_text')} /></label>
        <p><button className="btn" onClick={save}>Save lesson</button> {msg && <span className="note" role="status">{msg}</span>}</p>
      </div>
    </div>
    </>
  );
}
