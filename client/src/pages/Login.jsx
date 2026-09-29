import { useState } from 'react';
import { supabase } from '../supabaseClient';

export default function Login() {
  const [mode, setMode] = useState('in');
  const [f, setF] = useState({ name: '', email: '', password: '' });
  const [msg, setMsg] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  async function submit(e) {
    e.preventDefault(); setMsg('');
    const { error } = mode === 'in'
      ? await supabase.auth.signInWithPassword({ email: f.email, password: f.password })
      : await supabase.auth.signUp({ email: f.email, password: f.password, options: { data: { full_name: f.name } } });
    if (error) setMsg(error.message); else if (mode === 'up') setMsg('Account created. Check your email if confirmation is on.');
  }
  return (
    <form className="login card" onSubmit={submit}>
      <div className="brand dark">CodeMove <span>Kenya</span></div>
      <h2>{mode === 'in' ? 'Welcome back' : 'Create your account'}</h2>
      {mode === 'up' && <><label htmlFor="n">Full name</label><input id="n" required value={f.name} onChange={set('name')} /></>}
      <label htmlFor="e">Email</label><input id="e" type="email" required value={f.email} onChange={set('email')} />
      <label htmlFor="p">Password</label><input id="p" type="password" minLength={6} required value={f.password} onChange={set('password')} />
      {msg && <p className="note error">{msg}</p>}
      <button className="btn">{mode === 'in' ? 'Log in' : 'Sign up'}</button>
      <p className="muted"><a href="#" onClick={(e) => { e.preventDefault(); setMode(mode === 'in' ? 'up' : 'in'); }}>
        {mode === 'in' ? 'New here? Create an account' : 'Have an account? Log in'}</a></p>
    </form>
  );
}
