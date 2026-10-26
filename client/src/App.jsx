import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { supabase } from './supabaseClient';
import Layout from './components/Layout';
import Landing from './pages/Landing'; // NEW: public welcome page
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Courses from './pages/Courses';
import Course from './pages/Course';
import Lesson from './pages/Lesson';
import Quiz from './pages/Quiz';
import Badges from './pages/Badges';
import Leaderboard from './pages/Leaderboard'; // NEW
import Profile from './pages/Profile';
import Teacher from './pages/staff/Teacher';
import Admin from './pages/staff/Admin';

// NEW: pages inside the app need a login; anyone else is sent to /login (and brought back afterwards).
function NeedLogin({ session }) {
  const here = useLocation();
  return session ? <Layout /> : <Navigate to="/login" replace state={{ from: here.pathname }} />;
}
// NEW: /login shows the usual login page; someone who is already logged in goes straight on.
function LoginRoute({ session }) {
  const { state } = useLocation();
  return session ? <Navigate to={state?.from || '/home'} replace /> : <Login />;
}

export default function App() {
  const [session, setSession] = useState(undefined);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);
  if (session === undefined) return <p className="center">Loading…</p>;
  return (
    <BrowserRouter>
      <Routes>
        {/* CHANGED: everyone, logged in or not, lands on the welcome page first */}
        <Route path="/" element={<Landing signedIn={!!session} />} />
        <Route path="/login" element={<LoginRoute session={session} />} />
        <Route element={<NeedLogin session={session} />}>
          <Route path="home" element={<Dashboard />} />{/* the dashboard used to live at "/" */}
          <Route path="courses" element={<Courses />} />
          <Route path="courses/:slug" element={<Course />} />
          <Route path="lessons/:id" element={<Lesson />} />
          <Route path="quizzes/:id" element={<Quiz />} />
          <Route path="badges" element={<Badges />} />
          <Route path="leaderboard" element={<Leaderboard />} />{/* NEW */}
          <Route path="profile" element={<Profile />} />
          <Route path="staff" element={<Teacher />} />
          <Route path="admin" element={<Admin />} />
          <Route path="*" element={<Navigate to="/home" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
