-- IPSERA LifeOS — initial schema
-- Every table is owned per-row by auth.users(id) and locked down with RLS so a
-- user can only ever see or touch their own data.

create type task_status as enum ('todo', 'in_progress', 'done');
create type task_priority as enum ('low', 'medium', 'high');
create type project_status as enum ('active', 'on_hold', 'completed', 'archived');
create type goal_status as enum ('active', 'completed', 'abandoned');
create type reflection_type as enum ('daily', 'weekly');
create type ipsera_dimension as enum (
  'identity', 'physical', 'spiritual', 'economic', 'relationships', 'achievement'
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  status project_status not null default 'active',
  dimensions ipsera_dimension[] not null default '{}',
  target_date timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  status goal_status not null default 'active',
  dimensions ipsera_dimension[] not null default '{}',
  progress int not null default 0 check (progress between 0 and 100),
  target_date timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  notes text,
  status task_status not null default 'todo',
  priority task_priority not null default 'medium',
  dimensions ipsera_dimension[] not null default '{}',
  project_id uuid references public.projects(id) on delete set null,
  goal_id uuid references public.goals(id) on delete set null,
  due_date timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.reflections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type reflection_type not null default 'daily',
  date date not null,
  mood int not null check (mood between 1 and 5),
  wins text[] not null default '{}',
  challenges text[] not null default '{}',
  gratitude text[] not null default '{}',
  dimension_check_ins jsonb not null default '{}',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date, type)
);

create index tasks_user_id_idx on public.tasks (user_id);
create index projects_user_id_idx on public.projects (user_id);
create index goals_user_id_idx on public.goals (user_id);
create index reflections_user_id_idx on public.reflections (user_id);

alter table public.tasks enable row level security;
alter table public.projects enable row level security;
alter table public.goals enable row level security;
alter table public.reflections enable row level security;

create policy "own tasks only" on public.tasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own projects only" on public.projects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own goals only" on public.goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own reflections only" on public.reflections
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql security definer set search_path = '';

create trigger set_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.projects
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.goals
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.reflections
  for each row execute function public.set_updated_at();

alter publication supabase_realtime add table
  public.tasks, public.projects, public.goals, public.reflections;
