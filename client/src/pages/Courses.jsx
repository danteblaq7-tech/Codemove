import { useEffect, useState } from 'react';
import { api } from '../api';
import CourseCard from '../components/CourseCard';

export default function Courses() {
  const [courses, setCourses] = useState([]);
  useEffect(() => { api('/courses').then(setCourses).catch(() => {}); }, []);
  return (<><h1>Courses</h1><p className="muted">Build your first websites using HTML &amp; CSS.</p>
    <div className="grid">{courses.map((c) => <CourseCard key={c.id} c={c} />)}</div></>);
}
