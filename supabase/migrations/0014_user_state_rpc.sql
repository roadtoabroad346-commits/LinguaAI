-- LinguaAI 0014 — atomic user-state RPC + RLS re-audit (idempotent).
-- Apply after 0013. SECURITY INVOKER where RLS is enough so auth.uid() enforces ownership.

-- 1. complete_onboarding(payload jsonb): one-transaction onboarding write.
create or replace function public.complete_onboarding(payload jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_display text := nullif(payload ->> 'displayName', '');
  v_native text := nullif(payload ->> 'nativeLanguage', '');
  v_goals text[] := coalesce(
    (select array_agg(x) from jsonb_array_elements_text(coalesce(payload -> 'goals', '[]'::jsonb)) as x),
    '{}'
  );
  v_daily int := coalesce((payload ->> 'dailyGoalXp')::int, 30);
  v_mode text := nullif(payload ->> 'learningMode', '');
  v_lang text := coalesce(nullif(payload ->> 'preferredLanguage', ''), 'en');
  v_step int := coalesce((payload ->> 'onboardingStep')::int, 0);
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  if v_display is null or v_native is null or coalesce(array_length(v_goals, 1), 0) = 0 then
    raise exception 'Invalid onboarding data' using errcode = '22000';
  end if;
  if v_daily < 10 or v_daily > 200 then
    raise exception 'Invalid daily goal' using errcode = '22000';
  end if;
  if v_mode not in ('guided', 'free') then
    raise exception 'Invalid learning mode' using errcode = '22000';
  end if;

  insert into public.profiles (id, display_name, native_language, goals, daily_goal_xp, learning_mode, preferred_language, onboarding_step, onboarding_completed, onboarding_completed_at)
  values (auth.uid(), v_display, v_native, v_goals, v_daily, v_mode, v_lang, v_step, true, now())
  on conflict (id) do update set
    display_name = excluded.display_name,
    native_language = excluded.native_language,
    goals = excluded.goals,
    daily_goal_xp = excluded.daily_goal_xp,
    learning_mode = excluded.learning_mode,
    preferred_language = excluded.preferred_language,
    onboarding_step = greatest(public.profiles.onboarding_step, excluded.onboarding_step),
    onboarding_completed = true,
    onboarding_completed_at = coalesce(public.profiles.onboarding_completed_at, now());

  return jsonb_build_object('ok', true, 'next', '/placement');
end;
$$;

-- 2. save_placement_result(payload jsonb): insert history + sync profile atomically.
create or replace function public.save_placement_result(payload jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_score int := (payload ->> 'score')::int;
  v_total int := (payload ->> 'total')::int;
  v_level text := payload ->> 'level';
  v_answers jsonb := coalesce(payload -> 'answers', '[]'::jsonb);
  v_skills jsonb := coalesce(payload -> 'skillScores', '{}'::jsonb);
  v_duration int := nullif(payload ->> 'durationSeconds', '')::int;
  v_mode text := nullif(payload ->> 'learningMode', '');
  v_prev text;
  v_attempt int;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  if v_level not in ('A1','A2','B1','B2','C1') or v_total is null or v_total <= 0 or v_score is null or v_score < 0 then
    raise exception 'Invalid placement payload' using errcode = '22000';
  end if;

  select level into v_prev from public.profiles where id = auth.uid();
  select coalesce(max(attempt_number), 0) + 1 into v_attempt
  from public.placement_results where user_id = auth.uid();

  insert into public.placement_results (user_id, score, total, level, answers, skill_scores, correct_answers, duration_seconds, previous_level, attempt_number, test_version)
  values (auth.uid(), v_score, v_total, v_level, v_answers, v_skills, v_score, v_duration, v_prev, v_attempt, coalesce(payload ->> 'testVersion', 'v2'));

  update public.profiles
  set level = v_level,
      level_source = 'placement',
      placement_completed = true,
      placement_completed_at = now(),
      placement_score = round((v_score::numeric / greatest(v_total, 1)) * 100)::int,
      placement_taken_at = now(),
      learning_mode = coalesce(v_mode, learning_mode)
  where id = auth.uid();

  return jsonb_build_object(
    'ok', true,
    'level', v_level,
    'attempt', v_attempt,
    'previousLevel', v_prev
  );
end;
$$;

-- 3. get_user_bootstrap(): one JSON document for shell hydration.
create or replace function public.get_user_bootstrap()
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_profile jsonb;
  v_xp_today int := 0;
  v_dict int := 0;
  v_latest jsonb := null;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  select to_jsonb(p) into v_profile from public.profiles p where p.id = auth.uid();

  select coalesce(sum(amount), 0)::int into v_xp_today
  from public.xp_events
  where user_id = auth.uid()
    and created_at >= date_trunc('day', now());

  select count(*)::int into v_dict
  from public.dictionary_entries
  where user_id = auth.uid();

  select to_jsonb(r) into v_latest
  from (select level, created_at from public.placement_results
        where user_id = auth.uid() order by created_at desc limit 1) r;

  return jsonb_build_object(
    'profile', v_profile,
    'xpToday', v_xp_today,
    'dictionaryCount', v_dict,
    'latestPlacement', v_latest
  );
end;
$$;

-- 4. RLS re-audit: every user table locked down owner-only (idempotent).
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','xp_events','dictionary_entries','placement_results',
    'activity_events','daily_challenge_completions','skill_attempts',
    'writing_submissions','writing_errors','ai_messages',
    'speaking_attempts','read_aloud_attempts',
    'spelling_attempts','achievements','spelling_sessions'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
drop policy if exists "own xp" on public.xp_events;
create policy "own xp" on public.xp_events for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own dictionary" on public.dictionary_entries;
create policy "own dictionary" on public.dictionary_entries for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own placement results" on public.placement_results;
create policy "own placement results" on public.placement_results for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own activity" on public.activity_events;
create policy "own activity" on public.activity_events for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own challenge completions" on public.daily_challenge_completions;
create policy "own challenge completions" on public.daily_challenge_completions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own skill attempts" on public.skill_attempts;
create policy "own skill attempts" on public.skill_attempts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own writing submissions" on public.writing_submissions;
create policy "own writing submissions" on public.writing_submissions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own writing errors" on public.writing_errors;
create policy "own writing errors" on public.writing_errors for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own ai messages" on public.ai_messages;
create policy "own ai messages" on public.ai_messages for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own speaking attempts" on public.speaking_attempts;
create policy "own speaking attempts" on public.speaking_attempts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own read aloud attempts" on public.read_aloud_attempts;
create policy "own read aloud attempts" on public.read_aloud_attempts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own spelling attempts" on public.spelling_attempts;
create policy "own spelling attempts" on public.spelling_attempts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own spelling sessions" on public.spelling_sessions;
create policy "own spelling sessions" on public.spelling_sessions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own achievements" on public.achievements;
create policy "own achievements" on public.achievements for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

comment on function public.complete_onboarding(jsonb) is 'Atomic onboarding write: validates payload, upserts profile, marks onboarding complete.';
comment on function public.save_placement_result(jsonb) is 'Atomic placement save: inserts history row and syncs profiles.level/flags; retakes append history.';
comment on function public.get_user_bootstrap() is 'Single-document shell hydration: profile + xpToday + dictionary count + latest placement.';
