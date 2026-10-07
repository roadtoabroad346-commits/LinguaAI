-- LinguaAI Phase 7 — spelling attempts + achievements
-- Apply in Supabase SQL editor after 0001 → 0007, or via `supabase db push`.

-- Per-word spelling attempts (session_id groups one practice run; feeds Smart Path in Phase 8).
create table if not exists public.spelling_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  session_id uuid not null default gen_random_uuid(),
  mode text not null check (mode in ('listen','missing','choice')),
  word text not null,
  level text check (level in ('A1','A2','B1','B2','C1')),
  correct boolean not null default false,
  xp_earned int not null default 0 check (xp_earned >= 0 and xp_earned <= 1000),
  created_at timestamptz not null default now()
);
create index if not exists spelling_attempts_user_created_idx
  on public.spelling_attempts (user_id, created_at desc);
create index if not exists spelling_attempts_user_word_idx
  on public.spelling_attempts (user_id, word);

-- Unlocked achievements (one row per user + key).
create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  key text not null,
  unlocked_at timestamptz not null default now(),
  unique (user_id, key)
);
create index if not exists achievements_user_idx on public.achievements (user_id);

alter table public.spelling_attempts enable row level security;
drop policy if exists "own spelling attempts" on public.spelling_attempts;
create policy "own spelling attempts" on public.spelling_attempts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.achievements enable row level security;
drop policy if exists "own achievements" on public.achievements;
create policy "own achievements" on public.achievements
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
