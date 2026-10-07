-- LinguaAI Phase 4 — grammar + reading + listening progress.
-- Apply after 0001 → 0002 → 0003 → 0004, or via `supabase db push`.

-- One row per completed activity (quiz, comprehension, dictation).
create table if not exists public.skill_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  skill text not null check (skill in ('grammar','reading','listening','dictation')),
  slug text not null,
  score int not null default 0 check (score >= 0),
  total int not null default 0 check (total >= 0),
  xp_earned int not null default 0 check (xp_earned >= 0 and xp_earned <= 1000),
  created_at timestamptz not null default now()
);
create index if not exists skill_attempts_user_skill_idx
  on public.skill_attempts (user_id, skill, created_at desc);
create index if not exists skill_attempts_user_slug_idx
  on public.skill_attempts (user_id, skill, slug, created_at desc);

alter table public.skill_attempts enable row level security;
drop policy if exists "own skill attempts" on public.skill_attempts;
create policy "own skill attempts" on public.skill_attempts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
