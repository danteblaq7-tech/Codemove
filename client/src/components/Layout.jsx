import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Award, BookOpen, GraduationCap, House, Settings, Shield, Trophy } from 'lucide-react';
import { api } from '../api';
import logo from '../assets/logo.png';

export default function Layout() {
  const [me, setMe] = useState(null);
  useEffect(() => { api('/me').then((p) => { setMe(p); document.documentElement.dataset.theme = p.theme_preference || 'light'; }).catch(() => {}); }, []);
  const links = [
    ['/', 'Home', House],
    ['/courses', 'Courses', BookOpen],
    ['/badges', 'Badges', Award],
    ['/leaderboard', 'Leaderboard', Trophy],
    ['/profile', 'Profile', Settings],
  ];
  if (me && ['teacher', 'admin'].includes(me.role)) links.push(['/staff', 'Teacher', GraduationCap]);
  if (me?.role === 'admin') links.push(['/admin', 'Admin', Shield]);
  return (
    <div className="shell">
      <nav className="side" aria-label="Main">
        <div className="brand">
             <img src={logo} alt="" className="brand-logo" />
            COD<span>Move</span>
         </div>
        {links.map(([to, label, Icon]) => (
          <NavLink key={to} to={to} end={to === '/'}>
            <Icon className="nav-icon" aria-hidden="true" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      
      <main className="main"><Outlet context={{ me, setMe }} /></main>
    </div>
    
  );
}
