-- LinguaAI 0021 — security + performance + realtime remediation (idempotent).
-- Run THIS WHOLE FILE in one go (SQL Editor -> New query -> paste all -> Run).
-- Never edit earlier migrations. The trailing OK row proves the full file ran.
--
-- Fixes Supabase advisors + project review:
--  A. SECURITY DEFINER hardening: revoke client execution from trigger helpers,
--     keep check_shared_ip callable by authenticated only, fix search_path.
--  B. RLS performance: rewrite 22 user-ownership policies with (select auth.uid())
--     so the auth function is evaluated once per query, not per row.
--  C. Missing FK indexes: security_events.device_id, vocab_reviews.set_id,
--     writing_errors.submission_id.
--  D. Duplicate index: drop placement_results_user_created_idx2 (keep original).
--  E. achievements.created_at compatibility: add column mirroring unlocked_at
--     (old clients querying created_at stop 42703-erroring; new code orders by
--     unlocked_at, created_at is kept in sync by trigger).
--  F. Realtime: private user-scoped Broadcast for first live features:
--       user:<uuid>:notifications  (public.notifications INSERT/UPDATE/DELETE)
--       user:<uuid>:progress       (public.xp_events + public.achievements INSERT)
--     + narrow RLS policies on realtime.messages (no blanket public access)
--     + add tables to supabase_realtime publication for Postgres Changes fallback.
--     Client must subscribe with config { private: true } + realtime.setAuth().
--
-- Auth setting NOT fixable by SQL (do in Dashboard):
--   Authentication -> Protection -> "Leaked password protection" -> Enable.
--   (HaveIBeenPwned k-anonymity check on signup/password change.)

-- ============================================================================
-- 0. Prerequisites.
-- ============================================================================
create extension if not exists "pgcrypto";

-- ============================================================================
-- A. Function hardening.
-- ============================================================================

-- A1. touch_updated_at: previously had MUTABLE (missing) search_path.
-- Trigger-only helper: fixed empty search_path + revoke direct client calls.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
revoke all on function public.touch_updated_at() from public, anon, authenticated;

-- A2. set_updated_at: tighten search_path to include pg_temp (defense in depth).
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
revoke all on function public.set_updated_at() from public, anon, authenticated;

-- A3. handle_new_user: auth.users trigger only — must NOT be client-callable.
-- (Already had SET search_path = public; tighten + revoke.)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
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
revoke all on function public.handle_new_user() from public, anon, authenticated;

-- A4. sync_profile_level_on_placement: placement trigger only — not client-callable.
create or replace function public.sync_profile_level_on_placement()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
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
revoke all on function public.sync_profile_level_on_placement() from public, anon, authenticated;

-- A5. check_shared_ip: server-only login telemetry helper. Harden with an
-- explicit search_path and allow execution only through the service role.
create or replace function public.check_shared_ip(p_ip text)
returns int
language sql
security definer
set search_path = public, pg_temp
as $$
  select count(distinct user_id)::int
  from public.security_events
  where ip = p_ip
    and created_at >= now() - interval '1 hour'
    and user_id is not null;
$$;
revoke all on function public.check_shared_ip(text) from public, anon, authenticated;
grant execute on function public.check_shared_ip(text) to service_role;

-- ============================================================================
-- B. RLS performance: (select auth.uid()) — evaluated once per statement.
-- All policies remain user-ownership, FOR ALL, no blanket public access.
-- ============================================================================

-- profiles (owner column is id)
drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

drop policy if exists "own xp" on public.xp_events;
create policy "own xp" on public.xp_events
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "own dictionary" on public.dictionary_entries;
create policy "own dictionary" on public.dictionary_entries
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "own placement results" on public.placement_results;
create policy "own placement results" on public.placement_results
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "own activity" on public.activity_events;
create policy "own activity" on public.activity_events
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "own challenge completions" on public.daily_challenge_completions;
create policy "own challenge completions" on public.daily_challenge_completions
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "own skill attempts" on public.skill_attempts;
create policy "own skill attempts" on public.skill_attempts
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "own writing submissions" on public.writing_submissions;
create policy "own writing submissions" on public.writing_submissions
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "own writing errors" on public.writing_errors;
create policy "own writing errors" on public.writing_errors
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "own ai messages" on public.ai_messages;
create policy "own ai messages" on public.ai_messages
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "own speaking attempts" on public.speaking_attempts;
create policy "own speaking attempts" on public.speaking_attempts
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "own read aloud attempts" on public.read_aloud_attempts;
create policy "own read aloud attempts" on public.read_aloud_attempts
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "own spelling attempts" on public.spelling_attempts;
create policy "own spelling attempts" on public.spelling_attempts
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "own spelling sessions" on public.spelling_sessions;
create policy "own spelling sessions" on public.spelling_sessions
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "own achievements" on public.achievements;
create policy "own achievements" on public.achievements
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "own devices" on public.devices;
create policy "own devices" on public.devices
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "own security events" on public.security_events;
create policy "own security events" on public.security_events
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "own notifications" on public.notifications;
create policy "own notifications" on public.notifications
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "own vocab_sets" on public.vocab_sets;
create policy "own vocab_sets" on public.vocab_sets
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "own vocab_cards" on public.vocab_cards;
create policy "own vocab_cards" on public.vocab_cards
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "own vocab_reviews" on public.vocab_reviews;
create policy "own vocab_reviews" on public.vocab_reviews
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "own completion_claims" on public.completion_claims;
create policy "own completion_claims" on public.completion_claims
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- ============================================================================
-- C. Missing foreign-key indexes (advisor-flagged).
-- ============================================================================
create index if not exists security_events_device_id_idx
  on public.security_events (device_id);
create index if not exists vocab_reviews_set_idx
  on public.vocab_reviews (set_id, created_at desc);
create index if not exists writing_errors_submission_idx
  on public.writing_errors (submission_id);

-- ============================================================================
-- D. Duplicate index: keep original, drop the _idx2 duplicate.
-- Both were (user_id, created_at desc) on placement_results.
-- ============================================================================
create index if not exists placement_results_user_created_idx
  on public.placement_results (user_id, created_at desc);
drop index if exists public.placement_results_user_created_idx2;

-- ============================================================================
-- E. achievements.created_at compatibility.
-- Old/legacy queries ordering by created_at raised
--   "column achievements.created_at does not exist" (42703).
-- New canonical timestamp remains unlocked_at; created_at mirrors it.
-- ============================================================================
alter table public.achievements
  add column if not exists created_at timestamptz not null default now();

-- Backfill: existing rows get unlocked_at (ADD COLUMN DEFAULT filled now()).
update public.achievements
set created_at = unlocked_at
where created_at is distinct from unlocked_at;

create index if not exists achievements_user_created_idx
  on public.achievements (user_id, created_at desc);

-- Keep them in sync for future inserts (trigger-only, not client-callable).
create or replace function public.sync_achievement_created_at()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  -- If the client supplied only one of the two, mirror it; otherwise prefer unlocked_at.
  if new.unlocked_at is null and new.created_at is not null then
    new.unlocked_at := new.created_at;
  elsif new.created_at is null and new.unlocked_at is not null then
    new.created_at := new.unlocked_at;
  elsif new.created_at is distinct from new.unlocked_at then
    new.created_at := new.unlocked_at;
  end if;
  return new;
end;
$$;
revoke all on function public.sync_achievement_created_at() from public, anon, authenticated;

drop trigger if exists achievements_sync_created_at on public.achievements;
create trigger achievements_sync_created_at
  before insert on public.achievements
  for each row execute function public.sync_achievement_created_at();

-- ============================================================================
-- F. Realtime: private user-scoped Broadcast (recommended) + publication fallback.
-- First live features:
--   notifications -> topic user:<user_id>:notifications (INSERT/UPDATE/DELETE)
--   progress      -> topic user:<user_id>:progress      (xp_events + achievements INSERT)
-- Client: supabase.channel(`user:${uid}:notifications`, { config: { private: true } })
--         .on('broadcast', { event: 'INSERT' | 'UPDATE' | 'DELETE' }, handler)
--         .subscribe();  call supabase.realtime.setAuth() after sign-in.
-- ============================================================================

-- F1. Broadcast helper: one trigger function for all user-owned tables.
create or replace function public.broadcast_user_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id text;
  v_topic text;
begin
  if tg_op = 'DELETE' then
    v_user_id := (old.user_id)::text;
  else
    v_user_id := (new.user_id)::text;
  end if;
  if v_user_id is null or v_user_id = '' then
    return null;
  end if;

  if tg_table_name = 'notifications' then
    v_topic := 'user:' || v_user_id || ':notifications';
  else
    -- xp_events + achievements share the live-progress channel.
    v_topic := 'user:' || v_user_id || ':progress';
  end if;

  begin
    perform realtime.broadcast_changes(
      v_topic,          -- topic_name
      tg_op,            -- event_name (INSERT/UPDATE/DELETE)
      tg_op,            -- operation
      tg_table_name,    -- table_name
      tg_table_schema,  -- table_schema
      case when tg_op in ('INSERT', 'UPDATE') then new else null end,
      case when tg_op in ('UPDATE', 'DELETE') then old else null end
      -- level defaults to 'private': only authorized subscribers receive it.
    );
  exception
    when undefined_function or invalid_schema_name or undefined_table then
      -- Local dev without the realtime extension: skip silently, app still works via polling.
      null;
  end;
  return null;
end;
$$;
revoke all on function public.broadcast_user_change() from public, anon, authenticated;

-- F2. Attach triggers (idempotent).
drop trigger if exists notifications_broadcast on public.notifications;
create trigger notifications_broadcast
  after insert or update or delete on public.notifications
  for each row execute function public.broadcast_user_change();

drop trigger if exists xp_events_broadcast on public.xp_events;
create trigger xp_events_broadcast
  after insert on public.xp_events
  for each row execute function public.broadcast_user_change();

drop trigger if exists achievements_broadcast on public.achievements;
create trigger achievements_broadcast
  after insert on public.achievements
  for each row execute function public.broadcast_user_change();

-- F3. Narrow RLS on realtime.messages: owner-only receive on their own topics.
-- No blanket "allow everyone": topic must start with user:<auth.uid()>:
-- Realtime checks these on channel join (private: true) and caches per connection.
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'realtime' and table_name = 'messages') then
    -- Clean up any permissive placeholder from earlier experiments.
    execute 'drop policy if exists "authenticated can receive broadcasts" on realtime.messages';
    execute 'drop policy if exists "authenticated_users_can_receive" on realtime.messages';
    execute 'drop policy if exists "authenticated can receive broadcast" on realtime.messages';
    execute 'drop policy if exists "own-notifications-broadcast" on realtime.messages';
    execute 'drop policy if exists "own-user-broadcast" on realtime.messages';

    execute $pol$
      create policy "own-user-broadcast"
      on realtime.messages
      for select
      to authenticated
      using (
        realtime.messages.extension in ('broadcast')
        and (select realtime.topic()) like 'user:' || (select auth.uid())::text || ':%'
      )
    $pol$;
  end if;
end;
$$;

-- F4. Postgres Changes fallback: add live tables to supabase_realtime publication
-- so clients using postgres_changes also receive row-level (RLS-filtered) events.
-- Idempotent per-table with duplicate_object tolerance.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.notifications;
    exception when duplicate_object then null;
    end;
    begin
      alter publication supabase_realtime add table public.xp_events;
    exception when duplicate_object then null;
    end;
    begin
      alter publication supabase_realtime add table public.achievements;
    exception when duplicate_object then null;
    end;
  end if;
end;
$$;

comment on function public.broadcast_user_change() is 'Realtime Broadcast fan-out: notifications -> user:<uid>:notifications, xp_events+achievements -> user:<uid>:progress (private channels, RLS on realtime.messages).';

-- Proof this whole file ran.
select 'OK-0021' as migration,
  (select count(*) from pg_policies where schemaname = 'public' and policyname like 'own%') as own_policies,
  (select count(*) from pg_indexes where schemaname = 'public' and indexname in ('security_events_device_id_idx','vocab_reviews_set_idx','writing_errors_submission_idx')) as fk_indexes,
  (select count(*) from pg_class where relname = 'placement_results_user_created_idx2') as dup_remaining;
