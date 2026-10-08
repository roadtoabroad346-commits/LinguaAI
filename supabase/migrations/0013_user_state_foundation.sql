-- LinguaAI 0013 — user-state foundation (idempotent, safe to run more than once).
-- Never edit earlier migrations. Apply 0013 then 0014 in order.
-- Guarantees a profile for every auth user + typed onboarding/placement columns.
--
-- Order matters: columns FIRST (including prerequisites from 0001-0012,
-- re-declared here with IF NOT EXISTS so this file is self-sufficient),
-- then functions/triggers, then backfills. Nothing below references a
-- column that is not guaranteed to exist above it.

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

-- 4. Profile auto-creation on signup (Google + email). SECURITY DEFINER with fixed search_path.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url, preferred_language, timezone)
  values (
    new.id,
    new.email,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      nullif(new.raw_user_meta_data ->> 'display_name', '')
    ,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'avatar_url', ''),
      nullif(new.raw_user_meta_data ->> 'picture', '')
    ),
    'en',
    'UTC'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'on_auth_user_created') then
    execute 'create trigger on_auth_user_created '
      || 'after insert on auth.users '
      || 'for each row execute function public.handle_new_user()';
  end if;
end;
$$;

-- 5. Backfill profiles for existing auth users that lack one.
-- Safe: every referenced column is guaranteed by sections 0-1 above.
insert into public.profiles (id, email, display_name, avatar_url, preferred_language, timezone)
select
  u.id,
  u.email,
  coalesce(
    nullif(u.raw_user_meta_data ->> 'full_name', ''),
    nullif(u.raw_user_meta_data ->> 'name', ''),
    nullif(u.raw_user_meta_data ->> 'display_name', '')
  ),
  coalesce(
    nullif(u.raw_user_meta_data ->> 'avatar_url', ''),
    nullif(u.raw_user_meta_data ->> 'picture', '')
  ),
  'en',
  'UTC'
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
on conflict (id) do nothing;

-- 6. Integrity constraints (idempotent DO blocks).
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_xp_nonneg') then
    alter table public.profiles add constraint profiles_xp_nonneg check (total_xp >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_streak_nonneg') then
    alter table public.profiles add constraint profiles_streak_nonneg check (current_streak >= 0 and longest_streak >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_goal_range') then
    alter table public.profiles add constraint profiles_goal_range check (daily_goal_xp >= 5 and daily_goal_xp <= 1000);
  end if;
end;
$$;

-- 7. Placement index + attempt numbers for pre-existing rows.
create index if not exists placement_results_user_created_idx2
  on public.placement_results (user_id, created_at desc);

do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'placement_results' and column_name = 'attempt_number') then
    with ranked as (
      select id, row_number() over (partition by user_id order by created_at asc) as rn
      from public.placement_results
      where attempt_number is null
    )
    update public.placement_results pr
    set attempt_number = ranked.rn
    from ranked where pr.id = ranked.id;
  end if;
end;
$$;

-- 8. Backfill completion flags from history (repairs existing accounts).
-- Users with any placement row get placement_completed + level from the latest row.
with latest as (
  select distinct on (user_id) user_id, level, created_at
  from public.placement_results
  order by user_id, created_at desc
)
update public.profiles p
set
  placement_completed = true,
  placement_completed_at = coalesce(p.placement_completed_at, latest.created_at),
  level = coalesce(p.level, latest.level),
  level_source = coalesce(p.level_source, 'placement')
from latest
where p.id = latest.user_id
  and (p.placement_completed = false or p.level is null);

-- Profiles with a level + a non-empty goal count as onboarded (they finished the flow before flags existed).
update public.profiles
set onboarding_completed = true,
    onboarding_completed_at = coalesce(onboarding_completed_at, now())
where onboarding_completed = false
  and level is not null
  and coalesce(array_length(goals, 1), 0) > 0;

-- 9. updated_at triggers on every table that has the column.
do $$
declare r record;
begin
  for r in
    select table_name from information_schema.columns
    where table_schema = 'public' and column_name = 'updated_at'
  loop
    execute format('drop trigger if exists %I_touch on public.%I', r.table_name, r.table_name);
    execute format(
      'create trigger %I_touch before update on public.%I for each row execute function public.set_updated_at()',
      r.table_name, r.table_name
    );
  end loop;
end;
$$;

-- 10. Table / column documentation.
comment on table public.profiles is 'One row per auth user (auto-created by handle_new_user trigger); source of truth for onboarding, level, goals and settings.';
comment on column public.profiles.onboarding_step is 'Furthest completed onboarding step (0-based) for resumable onboarding.';
comment on column public.profiles.placement_completed is 'True once save_placement_result (or a backfilled history row) has set the level.';
comment on column public.profiles.level_source is 'How the level was set: placement test, self pick, manual edit, or default.';
comment on column public.profiles.preferences is 'Flexible per-user settings JSON (theme/motion overrides live locally, never here).';
comment on table public.placement_results is 'Full placement history, newest last; profiles.level mirrors the latest row. Retakes never delete history.';
