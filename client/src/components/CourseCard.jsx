import { Link } from 'react-router-dom';
export default function CourseCard({ c }) {
  const to = c.last_lesson_id ? `/lessons/${c.last_lesson_id}` : `/courses/${c.slug}`;
  return (
    <div className="card">
      <div className="icon">🌐</div>
      <h3>{c.title}</h3>
      <p className="muted">{c.description}</p>
      <p className="muted">{c.total_lessons} lessons · {c.total_quizzes} quizzes</p>
      <div className="bar"><i style={{ width: `${c.progress}%` }} /></div>
      <p className="muted">{Math.round(c.progress)}%</p>
      <Link className="btn" to={to}>{c.progress > 0 ? 'Continue →' : 'Start →'}</Link>{' '}
      <Link className="btn ghost" to={`/courses/${c.slug}`}>View course</Link>
    </div>
  );
}
