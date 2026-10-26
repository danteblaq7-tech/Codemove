-- =====================================================================
-- CodeMove – scheduled lesson release
-- Run ONCE in the Supabase SQL editor (after migration-hide-lessons.sql).
-- =====================================================================

-- 1) Optional release time. A lesson with a FUTURE release_at stays locked for learners
--    and opens by itself when that moment arrives (no job or restart needed).
alter table lessons add column if not exists release_at timestamptz;

-- 2) Locked lessons must not count towards learner scores / leaderboard totals.
--    Same view as before with ONE change: the release_at check.
create or replace view learner_scores as
with pub_lessons as (
  select l.id
  from lessons l join modules m on m.id = l.module_id join courses c on c.id = m.course_id
  where c.is_published and not l.is_hidden and (l.release_at is null or l.release_at <= now())
),
pub_quizzes as (
  select q.id
  from quizzes q join modules m on m.id = q.module_id join courses c on c.id = m.course_id
  where c.is_published and exists (select 1 from quiz_questions qq where qq.quiz_id = q.id)
),
best as (
  select qa.user_id, qa.quiz_id, max(qa.score) as best
  from quiz_attempts qa
  where qa.score is not null and qa.quiz_id in (select id from pub_quizzes)
  group by qa.user_id, qa.quiz_id
),
quiz_totals as (
  select user_id, sum(best)::numeric as quiz_points, count(*) as quizzes_taken from best group by user_id
),
lesson_totals as (
  select up.user_id, count(*) as lessons_completed
  from user_progress up
  where up.status = 'completed' and up.lesson_id in (select id from pub_lessons)
  group by up.user_id
)
select u.id as user_id, u.full_name, u.email, u.show_on_leaderboard,
       coalesce(lt.lessons_completed, 0)::int as lessons_completed,
       (select count(*) from pub_lessons)::int as lessons_total,
       coalesce(qt.quiz_points, 0)::float8     as quiz_points,
       coalesce(qt.quizzes_taken, 0)::int      as quizzes_taken,
       (select count(*) from pub_quizzes)::int as quizzes_total
from users u
left join lesson_totals lt on lt.user_id = u.id
left join quiz_totals  qt on qt.user_id = u.id
where u.role = 'learner' and u.is_active;

revoke all on learner_scores from anon, authenticated;
