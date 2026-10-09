-- =====================================================================
-- CodeMove – authoring + workspace migration
-- Run ONCE in the Supabase SQL editor, after schema.sql and teacher_admin.sql.
-- =====================================================================

-- 1) NEW: each learner's saved work per lesson (powers Save / autosave / "pick up where I left off")
create table if not exists user_code (
  user_id    uuid not null references users(id)   on delete cascade,
  lesson_id  uuid not null references lessons(id) on delete cascade,
  code       text not null default '',
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);
alter table user_code enable row level security;
drop policy if exists "own code" on user_code;
create policy "own code" on user_code for select to authenticated using (user_id = auth.uid());
-- (writes only happen through the API with the service-role key)

-- 2) NEW: cohort (class) names must be unique, so the bulk import can match "Cohort 3 – Eldoret" safely.
--    If this line errors you already have two classes with the same name: rename one, then re-run it.
--    Check first with:  select lower(trim(name)), count(*) from classes group by 1 having count(*) > 1;
create unique index if not exists classes_name_lower_uq on classes (lower(trim(name)));

-- 3) NEW: indexes that keep things fast once you have real numbers of students and lessons
create index if not exists class_members_user_idx   on class_members (user_id);
create index if not exists lessons_module_idx       on lessons (module_id, order_index);
create index if not exists modules_course_idx       on modules (course_id, order_index);
create index if not exists code_runs_user_lesson_ix on code_runs (user_id, lesson_id, created_at desc);
