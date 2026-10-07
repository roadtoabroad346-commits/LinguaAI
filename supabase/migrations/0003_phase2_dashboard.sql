-- LinguaAI Phase 2 — dashboard (streak, XP, activity, daily challenge)
-- Apply in Supabase SQL editor after 0001 + 0002, or via `supabase db push`.

-- Profile counters maintained by /api/xp and /api/daily-challenge/complete.
alter table public.profiles
  add column if not exists total_xp int not null default 0,
  add column if not exists current_streak int not null default 0,
  add column if not exists longest_streak int not null default 0,
  add column if not exists last_active_date date;

-- "Continue Learning" feed: one row per meaningful learning event.
create table if not exists public.activity_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null,
  title text not null,
  subtitle text,
  href text,
  xp int not null default 0 check (xp >= 0 and xp <= 1000),
  created_at timestamptz not null default now()
);
create index if not exists activity_events_user_created_idx
  on public.activity_events (user_id, created_at desc);

-- One completion per user per day (Phase 2 preview; full gamification in Phase 7).
create table if not exists public.daily_challenge_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  challenge_date date not null,
  score int not null check (score >= 0),
  total int not null check (total > 0),
  xp_earned int not null default 0 check (xp_earned >= 0 and xp_earned <= 1000),
  created_at timestamptz not null default now(),
  unique (user_id, challenge_date)
);
create index if not exists daily_challenge_completions_user_date_idx
  on public.daily_challenge_completions (user_id, challenge_date desc);

alter table public.activity_events enable row level security;
drop policy if exists "own activity" on public.activity_events;
create policy "own activity" on public.activity_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.daily_challenge_completions enable row level security;
drop policy if exists "own challenge completions" on public.daily_challenge_completions;
create policy "own challenge completions" on public.daily_challenge_completions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
