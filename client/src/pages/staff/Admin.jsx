import { useState } from 'react';
import { Navigate, useOutletContext } from 'react-router-dom';
import { api, useApi } from '../../api';
import Tabs from '../../components/Tabs';
import Account from '../../components/Account';
import { BulkImport, NewCourse, NewLesson } from '../../components/Authoring'; // NEW
import Rankings from '../../components/Rankings';       // NEW: graded ranking of learners
import { QuizManager } from '../../components/QuizBuilder'; // NEW: add / edit quizzes

const ROLES = ['learner', 'teacher', 'admin'];

export default function Admin() {
  const { me } = useOutletContext();
  const [tab, setTab] = useState('users');
  if (!me) return <p>Loading…</p>;
  if (me.role !== 'admin') return <Navigate to="/" />;
  return (
    <>
      <h1>Admin console</h1>
      <p className="muted">Manage people, classes and course content.</p>
      {/* CHANGED: new "Rankings" and "Quizzes" tabs */}
      <Tabs tabs={[['users', 'Users'], ['classes', 'Classes'], ['rankings', 'Rankings'], ['courses', 'Courses'], ['lessons', 'Add lessons'], ['quizzes', 'Quizzes'], ['account', 'My account']]} value={tab} onChange={setTab} />
      {tab === 'users' && <Users />}{tab === 'classes' && <AdminClasses />}{tab === 'courses' && <AdminCourses />}
      {tab === 'lessons' && <><NewLesson /><p className="muted">To change an existing lesson, use the Teacher portal → Edit lessons.</p></>}
      {tab === 'rankings' && <Rankings isAdmin />}{tab === 'quizzes' && <QuizManager isAdmin />}
      {tab === 'account' && <Account />}
    </>
  );
}

function Users() {
  const [u, load, err] = useApi('/admin/users');
  const [n, setN] = useState({ full_name: '', email: '', password: '', role: 'teacher' });
  const [msg, setMsg] = useState('');
  const act = async (fn) => { setMsg(''); try { await fn(); load(); } catch (e) { setMsg(e.message); } };
  if (!u) return <p>{err || 'Loading…'}</p>;
  const set = (k) => (e) => setN({ ...n, [k]: e.target.value });
  const patch = (id, body) => api(`/admin/users/${id}`, { method: 'PATCH', body });
  return (
    <>
      {msg && <p className="note" role="status">{msg}</p>}
      <div className="card scroll"><table>
        <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th></th></tr></thead>
        <tbody>{u.map((x) => (
          <tr key={x.id}><td>{x.full_name}</td><td>{x.email}</td>
            <td><select value={x.role} aria-label={`Role for ${x.full_name}`} onChange={(e) => act(() => patch(x.id, { role: e.target.value }))}>
              {ROLES.map((r) => <option key={r}>{r}</option>)}</select></td>
            <td><span className={`tag ${x.is_active ? '' : 'off'}`}>{x.is_active ? 'Active' : 'Disabled'}</span></td>
            <td><button className="btn ghost sm" onClick={() => { const p = prompt('New temporary password (8+ characters)'); if (p) act(() => api(`/admin/users/${x.id}/reset-password`, { method: 'POST', body: { password: p } }).then(() => setMsg(`Password reset for ${x.full_name}`))); }}>Reset password</button>{' '}
              <button className="btn ghost sm" onClick={() => act(() => patch(x.id, { is_active: !x.is_active }))}>{x.is_active ? 'Disable' : 'Enable'}</button></td></tr>))}</tbody>
      </table></div>
      <form className="card" onSubmit={(e) => { e.preventDefault(); act(() => api('/admin/users', { method: 'POST', body: n }).then(() => setN({ ...n, full_name: '', email: '', password: '' }))); }}>
        <h3>Add a user</h3>
        <div className="two">
          <div><label className="f">Name<input required value={n.full_name} onChange={set('full_name')} /></label>
            <label className="f">Email<input required type="email" value={n.email} onChange={set('email')} /></label></div>
          <div><label className="f">Role<select value={n.role} onChange={set('role')}>{ROLES.map((r) => <option key={r}>{r}</option>)}</select></label>
            <label className="f">Temporary password (8+)<input required minLength={8} value={n.password} onChange={set('password')} /></label></div>
        </div>
        <p><button className="btn">Add user</button></p>
      </form>
    </>
  );
}

function AdminClasses() {
  const [cl, load, err] = useApi('/admin/classes');
  const [us] = useApi('/admin/users');
  const [name, setName] = useState(''), [tid, setTid] = useState(''), [msg, setMsg] = useState('');
  if (!cl || !us) return <p>{err || 'Loading…'}</p>;
  const teachers = us.filter((x) => x.role === 'teacher' && x.is_active);
  const opts = <>{<option value="">Unassigned</option>}{teachers.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}</>;
  const run = (fn) => { setMsg(''); fn.then(load).catch((e) => setMsg(e.message)); };
  return (
    <>
      {msg && <p className="note error">{msg}</p>}
      <div className="card scroll"><table>
        <thead><tr><th>Class</th><th>Learners</th><th>Teacher</th></tr></thead>
        <tbody>{cl.map((c) => (
          <tr key={c.id}><td>{c.name}</td><td>{c.learners}</td>
            <td><select value={c.teacher_id || ''} aria-label={`Teacher for ${c.name}`}
              onChange={(e) => run(api(`/admin/classes/${c.id}`, { method: 'PATCH', body: { teacher_id: e.target.value } }))}>{opts}</select></td></tr>))}</tbody>
      </table></div>
      <form className="card row" onSubmit={(e) => { e.preventDefault(); run(api('/admin/classes', { method: 'POST', body: { name, teacher_id: tid } }).then(() => setName(''))); }}>
        <label className="f">New class name<input required value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label className="f">Teacher<select value={tid} onChange={(e) => setTid(e.target.value)}>{opts}</select></label>
        <button className="btn">Create class</button>
      </form>
      {/* NEW: bulk-add students into any cohort (admins may also auto-create cohorts from a "cohort" column) */}
      <BulkImport classes={cl} isAdmin onDone={load} />
    </>
  );
}
// CHANGED: courses can now be deleted, and their lessons managed (delete) from here. Admin only.
function AdminCourses() {
  const [c, load, err] = useApi('/admin/courses');
  const [open, setOpen] = useState(null);   // the course whose lessons are being managed
  const [del, setDel] = useState(null);     // { course, impact, typed } while a course deletion is being confirmed
  const [msg, setMsg] = useState(null);
  if (!c) return <p>{err || 'Loading…'}</p>;
  const toggle = (x) => api(`/admin/courses/${x.id}`, { method: 'PATCH', body: { is_published: !x.is_published } }).then(load);

  async function askDelete(x) {            // step 1: fetch "what will be lost" and show the confirmation box
    setMsg(null);
    try { setDel({ course: x, impact: await api(`/admin/courses/${x.id}/impact`), typed: '' }); }
    catch (e) { setMsg({ ok: false, text: e.message }); }
  }
  async function doDelete() {              // step 2: the server also checks that the typed title matches exactly
    try {
      await api(`/admin/courses/${del.course.id}`, { method: 'DELETE', body: { confirm_title: del.typed } });
      setMsg({ ok: true, text: `"${del.course.title}" was permanently deleted.` });
      setDel(null); setOpen(null); load();
    } catch (e) { setMsg({ ok: false, text: e.message }); }
  }

  return (
    <>
      {msg && <p className={msg.ok ? 'note' : 'note error'} role={msg.ok ? 'status' : 'alert'}>{msg.text}</p>}

      {del && (
        <div className="card" role="alertdialog" aria-label="Confirm course deletion" style={{ borderColor: '#D9534F', borderWidth: 2 }}>
          <h3 style={{ color: '#A83C39' }}>Permanently delete "{del.course.title}"?</h3>
          <p>This cannot be undone. It will erase <b>{del.impact.modules} module(s)</b>, <b>{del.impact.lessons} lesson(s)</b> and <b>{del.impact.quizzes} quiz(zes)</b>,
            plus the progress of <b>{del.impact.learners} learner(s)</b> and <b>{del.impact.attempts} quiz attempt(s)</b>. Leaderboard totals that include those attempts will change.</p>
          <p className="muted">Not sure? Press Cancel and use <b>Hide</b> instead. It keeps everything and you can bring the course back.</p>
          <label className="f">Type the course title to confirm:
            <input value={del.typed} onChange={(e) => setDel({ ...del, typed: e.target.value })} placeholder={del.course.title} autoComplete="off" />
          </label>
          <p className="row">
            <button className="btn" style={{ background: '#D9534F', borderColor: '#D9534F', color: '#fff' }} disabled={del.typed !== del.course.title} onClick={doDelete}>Delete permanently</button>
            <button className="btn ghost" onClick={() => setDel(null)}>Cancel</button>
          </p>
        </div>
      )}

      <div className="card scroll"><table>
        <thead><tr><th>Course</th><th>Lessons</th><th>Status</th><th></th></tr></thead>
        <tbody>{c.map((x) => (
          <tr key={x.id}><td>{x.title}</td><td>{x.lessons}</td>
            <td><span className={`tag ${x.is_published ? '' : 'off'}`}>{x.is_published ? 'Published' : 'Hidden'}</span></td>
            <td>
              <button className="btn ghost sm" onClick={() => toggle(x)}>{x.is_published ? 'Hide' : 'Publish'}</button>{' '}
              <button className="btn ghost sm" onClick={() => setOpen(open?.id === x.id ? null : x)}>{open?.id === x.id ? 'Close lessons' : 'Manage lessons'}</button>{' '}
              <button className="btn ghost sm" style={{ color: '#A83C39' }} onClick={() => askDelete(x)}>Delete…</button>
            </td></tr>))}</tbody>
      </table></div>

      {open && <CourseLessons key={open.id} course={open} onChanged={load} setMsg={setMsg} />}
    </>
  );
}

// NEW: lists a course's modules and lessons with a Delete button per lesson.
function CourseLessons({ course, onChanged, setMsg }) {
  const [mods, reload, err] = useApi(`/admin/courses/${course.id}/lessons`);
  if (!mods) return <p>{err || 'Loading…'}</p>;
  async function remove(l) {
    if (!window.confirm(`Delete the lesson "${l.title}"?\n\nLearners' progress and saved code for this lesson will be lost. This cannot be undone.`)) return;
    try {
      await api(`/admin/lessons/${l.id}`, { method: 'DELETE' });
      setMsg({ ok: true, text: `Lesson "${l.title}" was deleted.` });
      reload(); onChanged();
    } catch (e) { setMsg({ ok: false, text: e.message }); }
  }
  return (
    <div className="card scroll">
      <h3>Lessons in {course.title}</h3>
      {mods.length === 0 && <p className="muted">This course has no modules yet.</p>}
      {mods.map((m) => (
        <div key={m.id}>
          <h4>{m.title}</h4>
          {m.lessons.length === 0 ? <p className="muted">No lessons in this module.</p> : (
            <table><tbody>{m.lessons.map((l) => (
              <tr key={l.id}><td>{l.order_index}</td><td>{l.title}</td>
                <td><button className="btn ghost sm" style={{ color: '#A83C39' }} onClick={() => remove(l)}>Delete</button></td></tr>))}</tbody></table>
          )}
        </div>
      ))}
    </div>
  );
}
