-- Run after schema.sql. Adds roles, active flag, classes.
alter table users add column role text not null default 'learner' check (role in ('learner','teacher','admin'));
alter table users add column is_active boolean not null default true;
create table classes(
  id uuid primary key default gen_random_uuid(), name text not null,
  teacher_id uuid references users(id) on delete set null, created_at timestamptz default now());
create table class_members(
  class_id uuid references classes(id) on delete cascade, user_id uuid references users(id) on delete cascade,
  added_at timestamptz default now(), primary key(class_id, user_id));
alter table classes enable row level security;        -- no client policies: only the API (service role) uses these
alter table class_members enable row level security;
-- Sign-ups are always 'learner'. Promote your first admin manually:
-- update users set role = 'admin' where email = 'you@school.ke';
