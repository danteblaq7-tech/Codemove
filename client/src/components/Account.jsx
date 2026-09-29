import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { api } from '../api';

// Staff can change their name and password (current password is re-checked first).
export default function Account() {
  const { me, setMe } = useOutletContext();
  const [name, setName] = useState(me.full_name);
  const [f, setF] = useState({ cur: '', n1: '', n2: '' });
  const [msg, setMsg] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  async function saveName() {
    await api('/me', { method: 'PATCH', body: { full_name: name } });
    setMe({ ...me, full_name: name }); setMsg('Name saved');
  }
  async function savePw() {
    if (f.n1.length < 8) return setMsg('New password needs 8+ characters.');
    if (f.n1 !== f.n2) return setMsg('New passwords do not match.');
    const { error: e1 } = await supabase.auth.signInWithPassword({ email: me.email, password: f.cur });
    if (e1) return setMsg('Current password is wrong.');
    const { error } = await supabase.auth.updateUser({ password: f.n1 });
    setMsg(error ? error.message : 'Password updated');
    if (!error) setF({ cur: '', n1: '', n2: '' });
  }
  return (
    <>
      {msg && <p className="note" role="status">{msg}</p>}
      <div className="two">
        <div className="card"><h3>My details</h3>
          <label className="f">Name<input value={name} onChange={(e) => setName(e.target.value)} /></label>
          <p className="muted">Login email: {me.email}</p>
          <button className="btn" onClick={saveName}>Save name</button></div>
        <div className="card"><h3>Change password</h3>
          <label className="f">Current password<input type="password" value={f.cur} onChange={set('cur')} /></label>
          <label className="f">New password (8+ characters)<input type="password" value={f.n1} onChange={set('n1')} /></label>
          <label className="f">Repeat new password<input type="password" value={f.n2} onChange={set('n2')} /></label>
          <p><button className="btn" onClick={savePw}>Update password</button></p></div>
      </div>
    </>
  );
}
