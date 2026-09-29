import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { api } from '../api';

export default function Layout() {
  const [me, setMe] = useState(null);
  useEffect(() => { api('/me').then((p) => { setMe(p); document.documentElement.dataset.theme = p.theme_preference || 'light'; }).catch(() => {}); }, []);
  const links = [['/', '🏠 Home'], ['/courses', '📚 Courses'], ['/badges', '🏆 Badges'], ['/profile', '⚙ Profile']];
  if (me && ['teacher', 'admin'].includes(me.role)) links.push(['/staff', '🧑‍🏫 Teacher']);
  if (me?.role === 'admin') links.push(['/admin', '🛠 Admin']);
  return (
    <div className="shell">
      <nav className="side" aria-label="Main">
        <div className="brand">CodeMove <span>Kenya</span></div>
        {links.map(([to, label]) => <NavLink key={to} to={to} end={to === '/'}>{label}</NavLink>)}
      </nav>
      <main className="main"><Outlet context={{ me, setMe }} /></main>
    </div>
  );
}
