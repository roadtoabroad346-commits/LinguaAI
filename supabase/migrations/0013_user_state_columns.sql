-- LinguaAI 0013 — user-state columns (idempotent, safe to run more than once).
-- Run THIS WHOLE FILE in one go (SQL Editor -> New query -> paste all -> Run).
-- Apply 0013, then 0014, then 0015 in order. Never edit earlier migrations.
-- Only adds columns + one helper function. No backfills here, so a partial
-- paste cannot corrupt data; the trailing OK row proves the full file ran.

-- 0. Prerequisites from earlier migrations (no-op when 0001-0012 were applied).
alter table public.profiles
  add column if not exists email text,
  add column if not exists display_name text,
  add column if not exists level text check (level in ('A1','A2','B1','B2','C1')),
  add column if not exists learning_mode text check (learning_mode in ('guided','free')),
  add column if not exists daily_goal_xp int not null default 30,
  add column if not exists timezone text not null default 'UTC',
  add column if not exists preferred_language text not null default 'en',
  add column if not exists total_xp int not null default 0,
  add column if not exists current_streak int not null default 0,
  add column if not exists longest_streak int not null default 0,
  add column if not exists last_active_date date,
  add column if not exists onboarding_completed boolean not null default false,
  add column if not exists native_language text,
  add column if not exists goals text[] not null default '{}',
  add column if not exists placement_score int check (placement_score is null or (placement_score >= 0 and placement_score <= 100)),
  add column if not exists placement_taken_at timestamptz,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

-- 1. New typed profile columns (all IF NOT EXISTS, sensible defaults).
alter table public.profiles
  add column if not exists avatar_url text,
  add column if not exists onboarding_completed_at timestamptz,
  add column if not exists onboarding_step smallint not null default 0,
  add column if not exists placement_completed boolean not null default false,
  add column if not exists placement_completed_at timestamptz,
  add column if not exists level_source text check (level_source in ('placement','self','manual','default')),
  add column if not exists target_exam text,
  add column if not exists target_score text,
  add column if not exists target_date date,
  add column if not exists daily_goal_minutes smallint check (daily_goal_minutes is null or (daily_goal_minutes >= 5 and daily_goal_minutes <= 240)),
  add column if not exists daily_xp_goal integer check (daily_xp_goal is null or (daily_xp_goal >= 10 and daily_xp_goal <= 500)),
  add column if not exists priority_skills text[] not null default '{}',
  add column if not exists interests text[] not null default '{}',
  add column if not exists study_time_preference text,
  add column if not exists obstacles text[] not null default '{}',
  add column if not exists last_seen_at timestamptz,
  add column if not exists preferences jsonb not null default '{}'::jsonb;

-- 2. Placement history strengthening.
alter table public.placement_results
  add column if not exists skill_scores jsonb not null default '{}'::jsonb,
  add column if not exists correct_answers int,
  add column if not exists duration_seconds int check (duration_seconds is null or duration_seconds >= 0),
  add column if not exists previous_level text check (previous_level is null or previous_level in ('A1','A2','B1','B2','C1')),
  add column if not exists attempt_number int check (attempt_number is null or attempt_number >= 1),
  add column if not exists test_version text not null default 'v1';

-- 3. Shared updated-at helper (explicit search_path for safety).
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Proof this whole file ran (if you do not see OK-0013, the paste was truncated: re-copy the entire file).
select 'OK-0013' as migration;
