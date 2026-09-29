import { useOutletContext } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { api } from '../api';

export default function Profile() {
  const { me, setMe } = useOutletContext();
  if (!me) return <p>Loading…</p>;
  async function toggle() {
    const t = me.theme_preference === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = t; setMe({ ...me, theme_preference: t });
    await api('/me', { method: 'PATCH', body: { theme_preference: t } });
  }
  return (
    <>
      <h1>{me.full_name}</h1><p className="muted">Level {me.level} learner</p>
      <div className="grid stats">
        <div className="card"><b>{me.stats.lessons}</b><span className="muted">Lessons</span></div>
        <div className="card"><b>{me.stats.avgScore}%</b><span className="muted">Average quiz</span></div>
        <div className="card"><b>{me.stats.badges}</b><span className="muted">Badges</span></div>
      </div>
      <p className="streak">🔥 Learning streak: {me.streak_days} days</p>
      <button className="btn ghost" onClick={toggle}>Switch to {me.theme_preference === 'dark' ? 'light' : 'dark'} mode</button>{' '}
      <button className="btn danger" onClick={() => supabase.auth.signOut()}>Log out</button>
    </>
  );
}
