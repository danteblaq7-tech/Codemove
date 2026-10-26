import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Hand } from 'lucide-react';
import { api } from '../api';
import CourseCard from '../components/CourseCard';

export default function Dashboard() {
  const { me } = useOutletContext();
  const [courses, setCourses] = useState([]);
  useEffect(() => { api('/courses').then(setCourses).catch(() => {}); }, []);
  const hr = new Date().getHours();
  const greet = hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';
  const avg = courses.length ? Math.round(courses.reduce((a, c) => a + c.progress, 0) / courses.length) : 0;
  return (
    <>
      <h1>{greet}, {me?.full_name?.split(' ')[0] || 'learner'} <Hand className="inline-icon" aria-hidden="true" /></h1>
      <p className="muted">Ready to continue learning?</p>
      <div className="card"><h3>Your learning progress</h3><div className="bar big"><i style={{ width: `${avg}%` }} /></div><p className="muted">{avg}% overall</p></div>
      <h2>Continue learning</h2>
      <div className="grid">{courses.map((c) => <CourseCard key={c.id} c={c} />)}</div>
    </>
  );
}
