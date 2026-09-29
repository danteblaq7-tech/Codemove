create extension if not exists pgcrypto;

create table users(
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null, email text unique not null, avatar_url text,
  level int default 1, streak_days int default 0,
  theme_preference text default 'light' check (theme_preference in ('light','dark')),
  created_at timestamptz default now(), updated_at timestamptz default now());

create function handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into users(id,full_name,email) values(new.id,coalesce(new.raw_user_meta_data->>'full_name','Learner'),new.email);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

create table courses(
  id uuid primary key default gen_random_uuid(), title text not null, slug text unique not null,
  description text, thumbnail_url text, difficulty_level text default 'beginner',
  estimated_duration_minutes int default 0, total_lessons int default 0, total_quizzes int default 0,
  is_published boolean default false, created_at timestamptz default now(), updated_at timestamptz default now());
create table modules(
  id uuid primary key default gen_random_uuid(), course_id uuid not null references courses(id) on delete cascade,
  title text not null, description text, order_index int default 0, created_at timestamptz default now());
create table lessons(
  id uuid primary key default gen_random_uuid(), module_id uuid not null references modules(id) on delete cascade,
  title text not null, content text, code_example text, tip_text text,
  order_index int default 0, estimated_minutes int default 10, created_at timestamptz default now());
create table quizzes(
  id uuid primary key default gen_random_uuid(), module_id uuid not null references modules(id) on delete cascade,
  title text not null, description text, pass_score int default 70, total_questions int default 0, created_at timestamptz default now());
create table quiz_questions(
  id uuid primary key default gen_random_uuid(), quiz_id uuid not null references quizzes(id) on delete cascade,
  question_text text not null, question_type text default 'single' check (question_type in ('single','multiple')),
  order_index int default 0, created_at timestamptz default now());
create table quiz_options(
  id uuid primary key default gen_random_uuid(), question_id uuid not null references quiz_questions(id) on delete cascade,
  option_text text not null, is_correct boolean default false, order_index int default 0);

create table user_progress(
  id uuid primary key default gen_random_uuid(), user_id uuid not null references users(id) on delete cascade,
  lesson_id uuid not null references lessons(id) on delete cascade,
  status text default 'not_started' check (status in ('not_started','in_progress','completed')),
  completed_at timestamptz, updated_at timestamptz default now(), unique(user_id,lesson_id));
create table user_course_progress(
  id uuid primary key default gen_random_uuid(), user_id uuid not null references users(id) on delete cascade,
  course_id uuid not null references courses(id) on delete cascade,
  progress_percentage numeric(5,2) default 0, last_accessed_lesson_id uuid references lessons(id) on delete set null,
  is_completed boolean default false, completed_at timestamptz, updated_at timestamptz default now(), unique(user_id,course_id));
create table code_runs(
  id uuid primary key default gen_random_uuid(), user_id uuid not null references users(id) on delete cascade,
  lesson_id uuid not null references lessons(id) on delete cascade,
  code_content text, output text, has_error boolean default false, created_at timestamptz default now());
create table quiz_attempts(
  id uuid primary key default gen_random_uuid(), user_id uuid not null references users(id) on delete cascade,
  quiz_id uuid not null references quizzes(id) on delete cascade,
  score int, passed boolean, started_at timestamptz default now(), completed_at timestamptz);
create table quiz_attempt_answers(
  id uuid primary key default gen_random_uuid(), attempt_id uuid not null references quiz_attempts(id) on delete cascade,
  question_id uuid not null references quiz_questions(id) on delete cascade,
  selected_option_id uuid not null references quiz_options(id) on delete cascade, is_correct boolean);
create table badges(
  id uuid primary key default gen_random_uuid(), name text not null, description text, icon_url text,
  badge_type text default 'completed' check (badge_type in ('locked','in_progress','completed','special')),
  criteria jsonb, created_at timestamptz default now());
create table user_badges(
  id uuid primary key default gen_random_uuid(), user_id uuid not null references users(id) on delete cascade,
  badge_id uuid not null references badges(id) on delete cascade, earned_at timestamptz default now(),
  progress_percentage numeric(5,2) default 0,
  status text default 'locked' check (status in ('locked','in_progress','completed')), unique(user_id,badge_id));
create table notifications(
  id uuid primary key default gen_random_uuid(), user_id uuid not null references users(id) on delete cascade,
  type text default 'info' check (type in ('success','warning','error','info')),
  title text, message text, is_read boolean default false, created_at timestamptz default now());

-- RLS: the API uses the service role (bypasses RLS); these policies protect direct client access.
do $$ declare t text; begin
  foreach t in array array['courses','modules','lessons','quizzes','quiz_questions','badges'] loop
    execute format('alter table %I enable row level security',t);
    execute format('create policy "read %1$s" on %1$I for select to authenticated using (true)',t);
  end loop;
  foreach t in array array['user_progress','user_course_progress','code_runs','quiz_attempts','user_badges','notifications'] loop
    execute format('alter table %I enable row level security',t);
    execute format('create policy "own %1$s" on %1$I for select to authenticated using (user_id = auth.uid())',t);
  end loop;
end $$;
alter table users enable row level security;
create policy "own profile" on users for select to authenticated using (id = auth.uid());
alter table quiz_options enable row level security;        -- no policy: answers only via API
alter table quiz_attempt_answers enable row level security;

-- Seed
insert into courses(id,title,slug,description,is_published) values('11111111-1111-1111-1111-111111111111','HTML Fundamentals','html-fundamentals','Learn how webpages are structured.',true);
insert into modules(id,course_id,title,order_index) values('22222222-2222-2222-2222-222222222222','11111111-1111-1111-1111-111111111111','Getting started',1);
insert into lessons(module_id,title,content,code_example,tip_text,order_index) values
('22222222-2222-2222-2222-222222222222','Understanding HTML elements','<p>HTML elements are the building blocks of a webpage. The <code>&lt;h1&gt;</code> element is the main heading.</p>',E'<h1>Hello World</h1>\n<p>Welcome!</p>','HTML describes the structure of your webpage.',1),
('22222222-2222-2222-2222-222222222222','Headings and paragraphs','<p>Use h1 to h6 for headings and p for paragraphs.</p>',E'<h2>My page</h2>\n<p>About me</p>','Use only one h1 per page.',2);
insert into quizzes(id,module_id,title,pass_score,total_questions) values('33333333-3333-3333-3333-333333333333','22222222-2222-2222-2222-222222222222','HTML Fundamentals quiz',70,1);
insert into quiz_questions(id,quiz_id,question_text,order_index) values('44444444-4444-4444-4444-444444444444','33333333-3333-3333-3333-333333333333','Which tag is used for the main heading?',1);
insert into quiz_options(question_id,option_text,is_correct,order_index) values
('44444444-4444-4444-4444-444444444444','<p>',false,1),('44444444-4444-4444-4444-444444444444','<h1>',true,2),('44444444-4444-4444-4444-444444444444','<head>',false,3);
insert into badges(name,description,badge_type,criteria) values
('First Steps','Complete your first lesson','completed','{"type":"lessons_completed","count":1}'),
('HTML Explorer','Complete 2 lessons','completed','{"type":"lessons_completed","count":2}');
