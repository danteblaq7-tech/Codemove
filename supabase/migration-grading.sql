-- =====================================================================
-- CodeMove – grading, rankings, leaderboard & quizzes migration
-- Run ONCE in the Supabase SQL editor (after migration_authoring.sql).
-- =====================================================================

-- 1) NEW: learners may opt out of being listed on the student leaderboard
--    (they still see their own rank privately). Default = listed.
alter table users add column if not exists show_on_leaderboard boolean not null default true;

-- 2) NEW: one row per ACTIVE LEARNER with the raw numbers behind the grade.
--    Counts only PUBLISHED courses, and only quizzes that have questions.
--    "quiz_points" = sum of the learner's BEST score on each quiz (retakes allowed).
--    The weights and letter grades live in server/lib/scores.js, so you can change
--    the grading policy without touching the database.
create or replace view learner_scores as
with pub_lessons as (
  select l.id
  from lessons l join modules m on m.id = l.module_id join courses c on c.id = m.course_id
  where c.is_published
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

-- SECURITY: a plain view bypasses row-level security, so nobody but the API (service role)
-- may read it. Without this, anyone holding your public anon key could read every learner's marks.
revoke all on learner_scores from anon, authenticated;

-- 3) NEW: indexes for the quiz tables
create index if not exists quiz_attempts_user_quiz_ix on quiz_attempts (user_id, quiz_id);
create index if not exists quiz_questions_quiz_ix     on quiz_questions (quiz_id, order_index);
create index if not exists quiz_options_question_ix   on quiz_options (question_id, order_index);
create index if not exists quizzes_module_ix          on quizzes (module_id);
