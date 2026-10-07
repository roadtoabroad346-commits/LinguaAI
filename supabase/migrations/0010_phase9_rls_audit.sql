-- LinguaAI Phase 9 — final QA: RLS hardening audit (idempotent).
-- Apply after 0001 → 0009. Re-asserts deny-by-default RLS on every app table
-- so a partially-applied earlier migration can never leave a table public.

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

-- Owner-only policies (drop-if-exists + recreate = idempotent, keeps Phase 0–8 behavior).
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
