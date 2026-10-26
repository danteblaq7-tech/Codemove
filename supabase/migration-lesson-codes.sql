-- =====================================================================
-- CodeMove – lesson access codes ("locked until the teacher allows entry")
-- Run ONCE in the Supabase SQL editor (after migration-schedule-lessons.sql).
-- =====================================================================

-- 1) A lesson can require a class code.
--    requires_code = true , access_code = null   -> LOCKED, waiting for the teacher to issue a code
--    requires_code = true , access_code = 'K7M4QP' -> learners type the code to open it for themselves
--    requires_code = false                       -> no code needed (current behaviour)
alter table lessons add column if not exists requires_code boolean not null default false;
alter table lessons add column if not exists access_code text;
alter table lessons add column if not exists code_expires_at timestamptz;      -- optional: stop NEW entries after this time
create unique index if not exists lessons_access_code_uq on lessons (access_code) where access_code is not null;

-- 2) Remembers which learner has unlocked which lesson (stays unlocked after they enter the code once).
create table if not exists lesson_unlocks (
  user_id uuid not null references users(id) on delete cascade,
  lesson_id uuid not null references lessons(id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);
alter table lesson_unlocks enable row level security;          -- no policies: only the API (service role) uses it
revoke all on lesson_unlocks from anon, authenticated;

-- 3) SECURITY FIX. schema.sql let ANY logged-in user read the whole `lessons` table straight from
--    Supabase (bypassing the API). That would expose the text of hidden / locked lessons and the
--    access codes. The app never reads this table directly (everything goes through the API,
--    which uses the service role and bypasses these policies), so the policy is simply removed.
drop policy if exists "read lessons" on lessons;

-- 4) Scores: a lesson that is still waiting for its code does not count yet.
create or replace view learner_scores as
with pub_lessons as (
  select l.id
  from lessons l join modules m on m.id = l.module_id join courses c on c.id = m.course_id
  where c.is_published and not l.is_hidden and (l.release_at is null or l.release_at <= now())
    and (not l.requires_code or l.access_code is not null)
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
