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

// NEW: lesson state = hidden (teacher hid it) / scheduled (opens at release_at) / visible
const stateOf = (l) => (l.is_hidden ? 'hidden' : l.release_at && new Date(l.release_at) > new Date() ? 'scheduled' : l.requires_code ? (l.access_code ? 'coded' : 'waiting') : 'visible');
const when = (d) => new Date(d).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
const ICON = { hidden: '🚫 ', scheduled: '⏰ ', waiting: '🔒 ', coded: '🔑 ', visible: '' };

function Lessons() {
  const [raw, load, err] = useApi('/staff/lessons');
  // NEW: group by course → module → order, so lessons you add appear next to their siblings.
  const list = useMemo(() => raw && [...raw].sort((a, b) =>
    `${a.modules.courses.title}|${a.modules.title}`.localeCompare(`${b.modules.courses.title}|${b.modules.title}`) || (a.order_index ?? 0) - (b.order_index ?? 0)), [raw]);
  const [i, setI] = useState(0), [f, setF] = useState(null), [msg, setMsg] = useState(''), [adding, setAdding] = useState(false);
  const [sched, setSched] = useState(''), [drip, setDrip] = useState({ start: '', every: 7 }), [mins, setMins] = useState(60);   // NEW: schedule inputs
  useEffect(() => { if (list?.[i]) setF({ ...list[i] }); }, [list?.[i]?.id]);   // CHANGED: only reset the form when you pick a different lesson (so hiding a lesson never wipes unsaved typing)
  if (!list) return <p>{err || 'Loading…'}</p>;
  if (!list.length) return <NewLesson onDone={load} />;      // NEW: nothing to edit yet → go straight to adding
  if (!f) return <p>Loading…</p>;
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  async function save() {
    await api(`/staff/lessons/${f.id}`, { method: 'PATCH', body: { title: f.title, content: f.content, code_example: f.code_example, tip_text: f.tip_text } });
    setMsg('Lesson saved'); load();
  }
  // NEW: hide / release lessons to control the pace. Each click saves straight away.
  async function setHidden(id, hidden) {
    try { await api(`/staff/lessons/${id}`, { method: 'PATCH', body: { is_hidden: hidden } }); setMsg(hidden ? 'Lesson hidden from learners' : 'Lesson released to learners'); load(); }
    catch (e) { setMsg(e.message); }
  }
  async function setModuleHidden(moduleId, hidden) {
    if (hidden && !window.confirm('Hide EVERY lesson in this module from learners?')) return;
    try { await api(`/staff/modules/${moduleId}/visibility`, { method: 'POST', body: { hidden } }); setMsg(hidden ? 'All lessons in the module hidden' : 'All lessons in the module released'); load(); }
    catch (e) { setMsg(e.message); }
  }
  // NEW: open this one lesson at a chosen date/time (the browser's local time is used)
  async function scheduleLesson(id) {
    if (!sched) return setMsg('Pick a date and time first');
    try { await api(`/staff/lessons/${id}`, { method: 'PATCH', body: { release_at: new Date(sched).toISOString() } }); setMsg(`Scheduled to open ${when(sched)}`); setSched(''); load(); }
    catch (e) { setMsg(e.message); }
  }
  // NEW: drip a whole module: lesson 1 at the start time, then one more every N days
  async function dripModule(moduleId, n) {
    if (!drip.start) return setMsg('Pick a start date and time first');
    if (!window.confirm(`Open lesson 1 on ${when(drip.start)}, then one more lesson every ${drip.every} day(s), for all ${n} lessons in this module?\nThis replaces any hide/schedule already set on them.`)) return;
    try { await api(`/staff/modules/${moduleId}/schedule`, { method: 'POST', body: { start: new Date(drip.start).toISOString(), every_days: Number(drip.every) } }); setMsg('Release schedule applied to the module'); load(); }
    catch (e) { setMsg(e.message); }
  }
  // NEW: class codes. scope = 'lessons' | 'modules' | 'courses'; action = 'issue' | 'lock' | 'open'
  async function gate(scope, id, action) {
    if (scope !== 'lessons' && action === 'lock' && !window.confirm('Lock EVERY lesson here behind codes? Learners will need a code from you to open each one.')) return;
    if (scope !== 'lessons' && action === 'open' && !window.confirm('Remove the code lock from EVERY lesson here? They will open to all learners.')) return;
    try {
      await api(`/staff/${scope}/${id}/gate`, { method: 'POST', body: { action, minutes: Number(mins) || 0 } });
      setMsg({ issue: 'Code issued', lock: 'Locked – waiting for you to issue a code', open: 'Code lock removed' }[action]); load();
    } catch (e) { setMsg(e.message); }
  }
  const rowLabel = (l) => ({ visible: 'Hide', hidden: 'Show', scheduled: 'Open now', waiting: 'Issue code', coded: 'Lock' }[stateOf(l)]);
  const rowAction = (l) => { const k = stateOf(l); if (k === 'waiting') return gate('lessons', l.id, 'issue'); if (k === 'coded') return gate('lessons', l.id, 'lock'); return setHidden(l.id, k === 'visible'); };
  const cur = list[i];
  const st = stateOf(cur);
  const sibs = list.filter((x) => x.module_id === cur?.module_id);
  const count = (k) => sibs.filter((x) => stateOf(x) === k).length;
  return (
    <>
    {/* NEW: add a lesson to any course/module */}
    <p><button className="btn ghost" onClick={() => setAdding(!adding)}>{adding ? 'Close' : '➕ New lesson'}</button></p>
    {adding && <NewLesson onDone={load} />}
    <div className="split">
      <div className="card">{list.map((l, k) => (
        <div key={l.id} className="lrow">
          <button className={`tab full ${stateOf(l) !== 'visible' ? 'is-hidden' : ''}`} aria-selected={k === i} onClick={() => { setI(k); setMsg(''); setSched(''); }}
            title={stateOf(l) === 'scheduled' ? `Opens ${when(l.release_at)}` : undefined}>
            {ICON[stateOf(l)]}{stateOf(l) === 'coded' ? `[${l.access_code}] ` : ''}{l.modules.courses.title}: {l.title}</button>
          <button className="btn ghost sm" onClick={() => rowAction(l)}>{rowLabel(l)}</button>
        </div>))}</div>
      <div className="card">
        {/* NEW: pace controls – hide, release now, or schedule */}
        <div className={`pace ${st}`}>
          <b>{{ hidden: '🚫 Hidden from learners', scheduled: `⏰ Locked – opens ${when(cur.release_at)}`, waiting: '🔒 Locked – waiting for you to issue a code', coded: '🔑 Open with a class code', visible: '👁 Visible to learners' }[st]}</b>
          {st !== 'hidden' && <button className="btn sm" onClick={() => setHidden(cur.id, true)}>Hide this lesson</button>}
          {st !== 'visible' && <button className="btn sm" onClick={() => setHidden(cur.id, false)}>{st === 'scheduled' ? 'Open now' : 'Release this lesson'}</button>}
          <span className="sched">
            <label>Open on <input type="datetime-local" value={sched} onChange={(e) => setSched(e.target.value)} /></label>
            <button className="btn ghost sm" onClick={() => scheduleLesson(cur.id)}>Schedule</button>
          </span>
        </div>
        {/* NEW: class codes – lesson stays locked until the teacher issues a code; learners type it once to open it */}
        <div className={`pace ${st === 'coded' ? 'coded' : st === 'waiting' ? 'waiting' : 'module'}`}>
          <b>🔑 Class code</b>
          {!cur.requires_code && <><span className="muted">No code needed – open to everyone who can see this lesson.</span>
            <button className="btn sm" onClick={() => gate('lessons', cur.id, 'lock')}>Require a code</button></>}
          {cur.requires_code && <>
            <label className="sched">New entries allowed for <input type="number" min="0" max="1440" value={mins} onChange={(e) => setMins(e.target.value)} style={{ width: 70 }} /> min (0 = no limit)</label>
            {!cur.access_code
              ? <button className="btn sm" onClick={() => gate('lessons', cur.id, 'issue')}>Issue code</button>
              : <>
                  <span className="codebox" aria-label="Class code">{cur.access_code}</span>
                  <span className="muted">{cur.code_expires_at ? (new Date(cur.code_expires_at) > new Date() ? `new entries until ${when(cur.code_expires_at)}` : 'expired for new entries – issue a new code') : 'no time limit'}</span>
                  <button className="btn ghost sm" onClick={() => { navigator.clipboard?.writeText(cur.access_code); setMsg('Code copied'); }}>Copy</button>
                  <button className="btn ghost sm" onClick={() => gate('lessons', cur.id, 'issue')}>New code</button>
                  <button className="btn ghost sm" onClick={() => gate('lessons', cur.id, 'lock')}>Lock again</button></>}
            <button className="btn ghost sm" onClick={() => gate('lessons', cur.id, 'open')}>Remove code lock</button></>}
        </div>
        <div className="pace module">
          <b>Codes for many lessons</b>
          <span className="muted">Module “{cur.modules.title}”</span>
          <button className="btn ghost sm" onClick={() => gate('modules', cur.module_id, 'lock')}>🔒 Lock all</button>
          <button className="btn ghost sm" onClick={() => gate('modules', cur.module_id, 'issue')}>🔑 Issue missing codes</button>
          <button className="btn ghost sm" onClick={() => gate('modules', cur.module_id, 'open')}>Remove locks</button>
          <span className="muted">Whole course “{cur.modules.courses.title}”</span>
          <button className="btn ghost sm" onClick={() => gate('courses', cur.modules.course_id, 'lock')}>🔒 Lock all</button>
          <button className="btn ghost sm" onClick={() => gate('courses', cur.modules.course_id, 'issue')}>🔑 Issue missing codes</button>
          <button className="btn ghost sm" onClick={() => gate('courses', cur.modules.course_id, 'open')}>Remove locks</button>
        </div>
        <div className="pace module">
          <b>Module “{cur.modules.title}”</b>
          <span className="muted">{count('visible')} visible · {count('coded')} with codes · {count('waiting')} waiting · {count('scheduled')} scheduled · {count('hidden')} hidden</span>
          <button className="btn ghost sm" onClick={() => setModuleHidden(cur.module_id, true)}>Hide all</button>
          <button className="btn ghost sm" onClick={() => setModuleHidden(cur.module_id, false)}>Show all</button>
          <span className="sched">
            <label>Drip: start <input type="datetime-local" value={drip.start} onChange={(e) => setDrip({ ...drip, start: e.target.value })} /></label>
            <label>one lesson every <input type="number" min="0" max="365" value={drip.every} onChange={(e) => setDrip({ ...drip, every: e.target.value })} style={{ width: 60 }} /> day(s)</label>
            <button className="btn ghost sm" onClick={() => dripModule(cur.module_id, sibs.length)}>Apply</button>
          </span>
        </div>
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
