-- LinguaAI Phase 0 — database foundation
-- Apply in Supabase SQL editor or via `supabase db push`.
-- Stable table names reused by all later phases.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  level text check (level in ('A1','A2','B1','B2','C1')),
  learning_mode text check (learning_mode in ('guided','free')),
  daily_goal_xp int not null default 30,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.xp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount int not null check (amount > 0 and amount <= 1000),
  source text not null,
  created_at timestamptz not null default now()
);
create index if not exists xp_events_user_created_idx on public.xp_events (user_id, created_at desc);
create table if not exists public.dictionary_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  word text not null,
  mastery int not null default 0 check (mastery >= 0 and mastery <= 100),
  created_at timestamptz not null default now(),
  unique (user_id, word)
);
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
alter table public.profiles enable row level security;
alter table public.xp_events enable row level security;
alter table public.dictionary_entries enable row level security;
drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
drop policy if exists "own xp" on public.xp_events;
create policy "own xp" on public.xp_events for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own dictionary" on public.dictionary_entries;
create policy "own dictionary" on public.dictionary_entries for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
