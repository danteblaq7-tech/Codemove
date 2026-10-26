import { useState } from 'react';
import { supabase } from '../supabaseClient';
import './AuthLayout.css';
import favicon from '../assets/favicon.jpeg';

export default function Login() {
  const [mode, setMode] = useState('in');
  const [f, setF] = useState({ name: '', email: '', password: '' });
  const [msg, setMsg] = useState('');
  const [msgOk, setMsgOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setMsg('');
    setMsgOk(false);
    setBusy(true);
    const { error } = mode === 'in'
      ? await supabase.auth.signInWithPassword({ email: f.email, password: f.password })
      : await supabase.auth.signUp({
          email: f.email,
          password: f.password,
          options: { data: { full_name: f.name } },
        });
    setBusy(false);
    if (error) setMsg(error.message);
    else if (mode === 'up') {
      setMsg('Account created. Check your email if confirmation is on.');
      setMsgOk(true);
    }
  }

  // NEW: Google sign-in (needs the Google provider switched on in Supabase – see UPGRADE_NOTES.md)
  async function google() {
    setMsg('');
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
    if (error) setMsg(error.message);
  }

  const signingIn = mode === 'in';

  return (
    <div className="auth-page">
      <section className="auth-panel">
        <div className="auth-brand">CODMove<span>Kenya</span></div>
        <h1>{signingIn ? 'WELCOME BACK' : 'CREATE ACCOUNT'}</h1>
        <p className="auth-lead">
          {signingIn
            ? 'Sign in to continue to your dashboard.'
            : 'Join CodeMove Kenya and start learning today.'}
        </p>

        <form className="auth-form" onSubmit={submit}>
          {!signingIn && (
            <label className="auth-field">
              <span>Full name</span>
              <input value={f.name} onChange={set('name')} placeholder="Your full name" required />
            </label>
          )}

          <label className="auth-field">
            <span>Email</span>
            <input
              type="email"
              value={f.email}
              onChange={set('email')}
              placeholder="you@example.com"
              required
            />
          </label>

          <label className="auth-field">
            <span>Password</span>
            <div className="auth-password">
              <input
                type={passwordVisible ? 'text' : 'password'}
                value={f.password}
                onChange={set('password')}
                placeholder="At least 6 characters"
                minLength={6}
                required
              />
              <button type="button" onClick={() => setPasswordVisible(!passwordVisible)}>
                {passwordVisible ? 'Hide' : 'Show'}
              </button>
            </div>
          </label>

          {msg && (
            <p className={msgOk ? 'auth-success' : 'auth-error'} role={msgOk ? 'status' : 'alert'}>
              {msg}
            </p>
          )}

          <button type="submit" className="auth-btn" disabled={busy}>
            {busy ? 'PLEASE WAIT...' : signingIn ? 'LOGIN' : 'SIGN UP'}
          </button>

          <button type="button" className="auth-btn auth-google" onClick={google}>
            CONTINUE WITH GOOGLE
          </button>

          <p className="auth-footer">
            {signingIn ? "Don't have an account? " : 'Already have an account? '}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setMode(signingIn ? 'up' : 'in');
                setMsg('');
              }}
            >
              {signingIn ? 'SIGN UP' : 'LOG IN'}
            </a>
          </p>
        </form>
      </section>

      <aside className="auth-visual">
        <img src={favicon} alt="CodeMove Kenya logo" />
        <div className="auth-overlay">
          <h2>CODMove Kenya</h2>
          <p>A brighter tomorrow through tech skills.</p>
        </div>
      </aside>
    </div>
  );
}