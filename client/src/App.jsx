import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Courses from './pages/Courses';
import Course from './pages/Course';
import Lesson from './pages/Lesson';
import Quiz from './pages/Quiz';
import Badges from './pages/Badges';
import Profile from './pages/Profile';
import Teacher from './pages/staff/Teacher';
import Admin from './pages/staff/Admin';

export default function App() {
  const [session, setSession] = useState(undefined);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);
  if (session === undefined) return <p className="center">Loading…</p>;
  if (!session) return <Login />;
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="courses" element={<Courses />} />
          <Route path="courses/:slug" element={<Course />} />
          <Route path="lessons/:id" element={<Lesson />} />
          <Route path="quizzes/:id" element={<Quiz />} />
          <Route path="badges" element={<Badges />} />
          <Route path="profile" element={<Profile />} />
          <Route path="staff" element={<Teacher />} />
          <Route path="admin" element={<Admin />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
