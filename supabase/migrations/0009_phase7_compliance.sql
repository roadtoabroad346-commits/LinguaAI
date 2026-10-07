-- LinguaAI Phase 7 compliance — timezone-aware streaks + idempotent spelling XP
-- Apply in Supabase SQL editor after 0001 → 0008, or via `supabase db push`.

-- Learner timezone (IANA name, e.g. "Europe/Berlin"). All streak/challenge
-- date keys are computed in this zone; UTC when never set.
alter table public.profiles
  add column if not exists timezone text not null default 'UTC';

-- One row per submitted spelling session: re-submits with the same session_id
-- return this stored grade WITHOUT awarding XP again.
create table if not exists public.spelling_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  session_id uuid not null,
  mode text not null check (mode in ('listen','meaning','missing','choice')),
  score int not null default 0 check (score >= 0),
  total int not null default 0 check (total >= 0),
  xp_earned int not null default 0 check (xp_earned >= 0 and xp_earned <= 1000),
  perfect boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, session_id)
);
create index if not exists spelling_sessions_user_created_idx
  on public.spelling_sessions (user_id, created_at desc);

-- A word can appear only once per session: retries hit this constraint
-- instead of creating duplicate attempts/XP (idempotent re-run safe).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'spelling_attempts_session_word_unique'
  ) THEN
    ALTER TABLE public.spelling_attempts
      ADD CONSTRAINT spelling_attempts_session_word_unique UNIQUE (session_id, word);
  END IF;
END $$;

-- Widen the 0008 mode check (auto-named there) to include the new `meaning` mode.
DO $$
DECLARE old_name text;
BEGIN
  SELECT conname INTO old_name FROM pg_constraint
    WHERE conrelid = 'public.spelling_attempts'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%listen%';
  IF old_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.spelling_attempts DROP CONSTRAINT %I', old_name);
  END IF;
END $$;
alter table public.spelling_attempts
  drop constraint if exists spelling_attempts_mode_check;
alter table public.spelling_attempts
  add constraint spelling_attempts_mode_check check (mode in ('listen','meaning','missing','choice'));

-- Challenge completions were already unique per (user, date) in 0003; nothing to add.

alter table public.spelling_sessions enable row level security;
drop policy if exists "own spelling sessions" on public.spelling_sessions;
create policy "own spelling sessions" on public.spelling_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
