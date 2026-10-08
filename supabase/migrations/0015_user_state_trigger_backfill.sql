-- LinguaAI 0015 — profile trigger + backfills + integrity (idempotent).
-- Run THIS WHOLE FILE in one go (SQL Editor -> New query -> paste all -> Run).
-- Apply 0013, then 0014, then 0015 in order. Never edit earlier migrations.
-- The trailing result row proves the full file ran and shows profile coverage.

-- 0. Preflight: fail fast with a clear message when 0013 was not applied.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'avatar_url'
  ) then
    raise exception 'Apply supabase/migrations/0013_user_state_columns.sql first (profiles.avatar_url is missing).';
  end if;
end;
$$;

-- 1. Profile auto-creation on signup (Google + email). SECURITY DEFINER with fixed search_path.
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
    ),
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

-- 2. Backfill profiles for existing auth users that lack one.
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

-- 3. Integrity constraints (idempotent DO blocks).
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

-- 4. Placement index + attempt numbers for pre-existing rows.
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

-- 5. Backfill completion flags from history (repairs existing accounts).
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

-- 6. updated_at triggers on every table that has the column.
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

-- 7. Table / column documentation.
comment on table public.profiles is 'One row per auth user (auto-created by handle_new_user trigger); source of truth for onboarding, level, goals and settings.';
comment on column public.profiles.onboarding_step is 'Furthest completed onboarding step (0-based) for resumable onboarding.';
comment on column public.profiles.placement_completed is 'True once save_placement_result (or a backfilled history row) has set the level.';
comment on column public.profiles.level_source is 'How the level was set: placement test, self pick, manual edit, or default.';
comment on column public.profiles.preferences is 'Flexible per-user settings JSON (theme/motion overrides live locally, never here).';
comment on table public.placement_results is 'Full placement history, newest last; profiles.level mirrors the latest row. Retakes never delete history.';

-- Proof this whole file ran (if you do not see OK-0015, the paste was truncated: re-copy the entire file).
select 'OK-0015' as migration,
  (select count(*) from public.profiles) as profiles,
  (select count(*) from auth.users) as auth_users;
