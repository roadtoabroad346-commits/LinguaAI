-- LinguaAI 0016 — level sync guard (idempotent, safe to run more than once).
-- Run THIS WHOLE FILE in one go (SQL Editor -> New query -> paste all -> Run).
-- Never edit earlier migrations. The trailing OK row proves the full file ran.
--
-- Problem: profiles.level stayed NULL for users who skipped placement or hit
-- the legacy insert+update fallback in /api/placement/submit when the profile
-- update failed after the history row was inserted ("Result saved, but profile
-- update failed"). The atomic RPC (0014) cannot produce orphans, but the
-- two-statement legacy path could.
-- Fix: a trigger mirrors EVERY placement_results insert into profiles.level,
-- so the level is written even if the API's profile update fails. Plus a
-- backfill that repairs any orphans created before this migration.

-- 0. Preflight: 0013 must be applied (level_source / placement_completed exist).
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'level_source'
  ) then
    raise exception 'Apply supabase/migrations/0013_user_state_columns.sql first (profiles.level_source is missing).';
  end if;
end;
$$;

-- 1. Trigger: every placement insert syncs the profile (SECURITY DEFINER so it
-- works regardless of RLS; fixed search_path for safety). Newest row wins,
-- which matches "profiles.level mirrors the latest placement row".
create or replace function public.sync_profile_level_on_placement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set level = new.level,
      level_source = 'placement',
      placement_completed = true,
      placement_completed_at = coalesce(placement_completed_at, new.created_at, now()),
      placement_score = round((new.score::numeric / greatest(new.total, 1)) * 100)::int,
      placement_taken_at = new.created_at
  where id = new.user_id
    and (level is distinct from new.level or placement_completed = false);
  return new;
end;
$$;

drop trigger if exists placement_results_sync_level on public.placement_results;
create trigger placement_results_sync_level
  after insert on public.placement_results
  for each row execute function public.sync_profile_level_on_placement();

-- 2. Backfill: repair orphans (history exists, profile.level is NULL).
with latest as (
  select distinct on (user_id) user_id, level, score, total, created_at
  from public.placement_results
  order by user_id, created_at desc
)
update public.profiles p
set
  level = latest.level,
  level_source = coalesce(p.level_source, 'placement'),
  placement_completed = true,
  placement_completed_at = coalesce(p.placement_completed_at, latest.created_at),
  placement_score = coalesce(
    p.placement_score,
    round((latest.score::numeric / greatest(latest.total, 1)) * 100)::int
  ),
  placement_taken_at = coalesce(p.placement_taken_at, latest.created_at)
from latest
where p.id = latest.user_id
  and (p.level is null or p.placement_completed = false);

-- Proof this whole file ran + shows remaining NULL-level profiles that have
-- NO placement history (users who skipped the test — they need the nudge,
-- not a backfill).
select 'OK-0016' as migration,
  (select count(*) from public.profiles where level is null) as null_level_profiles,
  (select count(*) from public.profiles p
     where p.level is null
       and not exists (select 1 from public.placement_results r where r.user_id = p.id)
  ) as null_level_without_history;
