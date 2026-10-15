-- LinguaAI — universal practice sessions, answers, mistake notebook and review schedule.
-- Additive: existing lesson history, placement results and profile levels are untouched.

create table if not exists public.practice_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_key uuid not null,
  mode text not null check (mode in ('daily', 'smart-review', 'mixed', 'topic', 'skill')),
  level text check (level is null or level in ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  skill text,
  topic text,
  content_version integer not null default 1 check (content_version > 0),
  status text not null default 'in_progress' check (status in ('in_progress', 'completed', 'abandoned')),
  score integer not null default 0 check (score between 0 and 100),
  total integer not null default 0 check (total >= 0),
  revision integer not null default 0 check (revision >= 0),
  state jsonb not null default '{}'::jsonb check (jsonb_typeof(state) = 'object'),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, session_key),
  unique (id, user_id)
);

create table if not exists public.practice_answers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_id text not null check (char_length(exercise_id) between 1 and 120),
  content_version integer not null check (content_version > 0),
  answer jsonb not null,
  score integer check (score is null or score between 0 and 100),
  correct boolean,
  feedback jsonb not null default '{}'::jsonb,
  answered_at timestamptz not null default now(),
  foreign key (session_id, user_id) references public.practice_sessions(id, user_id) on delete cascade,
  unique (session_id, exercise_id, content_version)
);

create table if not exists public.mistake_notebook (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_id text not null,
  content_version integer not null check (content_version > 0),
  skill text not null,
  topic text not null,
  last_answer jsonb not null,
  explanation text not null default '',
  occurrences integer not null default 1 check (occurrences > 0),
  resolved_at timestamptz,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (user_id, exercise_id, content_version)
);

create table if not exists public.practice_review_schedule (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_id text not null,
  content_version integer not null check (content_version > 0),
  skill text not null,
  topic text not null,
  interval_days integer not null default 1 check (interval_days between 1 and 365),
  ease_factor numeric(4,2) not null default 2.50 check (ease_factor between 1.30 and 3.00),
  review_count integer not null default 0 check (review_count >= 0),
  last_result boolean,
  last_reviewed_at timestamptz,
  next_review_at timestamptz not null default now(),
  unique (user_id, exercise_id, content_version)
);

create index if not exists practice_sessions_user_updated_idx
  on public.practice_sessions (user_id, updated_at desc);
create index if not exists practice_sessions_user_status_idx
  on public.practice_sessions (user_id, status, updated_at desc);
create index if not exists practice_answers_session_idx
  on public.practice_answers (session_id, answered_at);
create index if not exists mistake_notebook_user_last_seen_idx
  on public.mistake_notebook (user_id, resolved_at, last_seen_at desc);
create index if not exists practice_review_due_idx
  on public.practice_review_schedule (user_id, next_review_at)
  where next_review_at is not null;

alter table public.practice_sessions enable row level security;
alter table public.practice_answers enable row level security;
alter table public.mistake_notebook enable row level security;
alter table public.practice_review_schedule enable row level security;

drop policy if exists "own practice_sessions select" on public.practice_sessions;
create policy "own practice_sessions select" on public.practice_sessions for select to authenticated
  using ((select auth.uid()) = user_id);
drop policy if exists "own practice_sessions insert" on public.practice_sessions;
create policy "own practice_sessions insert" on public.practice_sessions for insert to authenticated
  with check ((select auth.uid()) = user_id);
drop policy if exists "own practice_sessions update" on public.practice_sessions;
create policy "own practice_sessions update" on public.practice_sessions for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "own practice_sessions delete" on public.practice_sessions;
create policy "own practice_sessions delete" on public.practice_sessions for delete to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "own practice_answers" on public.practice_answers;
create policy "own practice_answers" on public.practice_answers for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "own mistake_notebook" on public.mistake_notebook;
create policy "own mistake_notebook" on public.mistake_notebook for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "own practice_review_schedule" on public.practice_review_schedule;
create policy "own practice_review_schedule" on public.practice_review_schedule for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.practice_sessions to authenticated;
grant select, insert, update, delete on public.practice_answers to authenticated;
grant select, insert, update, delete on public.mistake_notebook to authenticated;
grant select, insert, update, delete on public.practice_review_schedule to authenticated;

-- One authenticated RPC makes answer autosave, mistake tracking, review
-- scheduling and the optimistic revision bump atomic. Stale tabs fail closed.
create or replace function public.save_practice_answer(
  p_session_key uuid,
  p_expected_revision integer,
  p_mode text,
  p_level text,
  p_skill text,
  p_topic text,
  p_exercise_id text,
  p_content_version integer,
  p_answer jsonb,
  p_score integer,
  p_correct boolean,
  p_feedback jsonb,
  p_state jsonb default '{}'::jsonb,
  p_complete boolean default false
) returns table(session_id uuid, revision integer, session_score integer, answer_count integer, status text)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_session_id uuid;
  v_revision integer;
  v_interval integer;
begin
  if v_user_id is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  if p_expected_revision < 0 then raise exception 'INVALID_REVISION' using errcode = '22023'; end if;

  insert into public.practice_sessions (user_id, session_key, mode, level, skill, topic)
  values (v_user_id, p_session_key, p_mode, p_level, p_skill, p_topic)
  on conflict (user_id, session_key) do nothing;

  select ps.id, ps.revision into v_session_id, v_revision
  from public.practice_sessions ps
  where ps.user_id = v_user_id and ps.session_key = p_session_key
  for update;

  if v_session_id is null then raise exception 'SESSION_NOT_FOUND' using errcode = 'P0002'; end if;
  if v_revision <> p_expected_revision then raise exception 'STALE_WRITE:%', v_revision using errcode = '40001'; end if;

  insert into public.practice_answers (
    session_id, user_id, exercise_id, content_version, answer, score, correct, feedback
  ) values (
    v_session_id, v_user_id, p_exercise_id, p_content_version, p_answer, p_score, p_correct, coalesce(p_feedback, '{}'::jsonb)
  ) on conflict (session_id, exercise_id, content_version) do update set
    answer = excluded.answer, score = excluded.score, correct = excluded.correct,
    feedback = excluded.feedback, answered_at = now();

  if p_correct is false then
    insert into public.mistake_notebook (
      user_id, exercise_id, content_version, skill, topic, last_answer, explanation
    ) values (
      v_user_id, p_exercise_id, p_content_version, p_skill, p_topic, p_answer,
      coalesce(p_feedback->>'explanation', '')
    ) on conflict (user_id, exercise_id, content_version) do update set
      last_answer = excluded.last_answer,
      explanation = excluded.explanation,
      occurrences = public.mistake_notebook.occurrences + 1,
      resolved_at = null,
      last_seen_at = now();
  elsif p_correct is true then
    update public.mistake_notebook set resolved_at = now(), last_seen_at = now()
    where user_id = v_user_id and exercise_id = p_exercise_id and content_version = p_content_version;
  end if;

  select prs.interval_days into v_interval
  from public.practice_review_schedule prs
  where prs.user_id = v_user_id and prs.exercise_id = p_exercise_id and prs.content_version = p_content_version;
  v_interval := case when p_correct is true then least(365, greatest(1, coalesce(v_interval, 1) * 2)) else 1 end;

  insert into public.practice_review_schedule (
    user_id, exercise_id, content_version, skill, topic, interval_days, ease_factor,
    review_count, last_result, last_reviewed_at, next_review_at
  ) values (
    v_user_id, p_exercise_id, p_content_version, p_skill, p_topic, v_interval,
    case when p_correct is true then 2.50 else 2.20 end, 1, p_correct, now(), now() + make_interval(days => v_interval)
  ) on conflict (user_id, exercise_id, content_version) do update set
    skill = excluded.skill, topic = excluded.topic, interval_days = excluded.interval_days,
    ease_factor = greatest(1.30, least(3.00,
      public.practice_review_schedule.ease_factor + case when p_correct is true then 0.05 else -0.20 end)),
    review_count = public.practice_review_schedule.review_count + 1,
    last_result = excluded.last_result, last_reviewed_at = now(), next_review_at = excluded.next_review_at;

  update public.practice_sessions ps set
    revision = ps.revision + 1,
    state = ps.state || coalesce(p_state, '{}'::jsonb),
    score = coalesce((select round(avg(pa.score))::integer from public.practice_answers pa where pa.session_id = v_session_id and pa.score is not null), 0),
    total = (select count(*)::integer from public.practice_answers pa where pa.session_id = v_session_id),
    status = case when p_complete then 'completed' else ps.status end,
    completed_at = case when p_complete then coalesce(ps.completed_at, now()) else ps.completed_at end,
    updated_at = now()
  where ps.id = v_session_id;

  return query select ps.id, ps.revision, ps.score, ps.total, ps.status
  from public.practice_sessions ps where ps.id = v_session_id;
end;
$$;

revoke all on function public.save_practice_answer(uuid, integer, text, text, text, text, text, integer, jsonb, integer, boolean, jsonb, jsonb, boolean) from public;
revoke all on function public.save_practice_answer(uuid, integer, text, text, text, text, text, integer, jsonb, integer, boolean, jsonb, jsonb, boolean) from anon;
grant execute on function public.save_practice_answer(uuid, integer, text, text, text, text, text, integer, jsonb, integer, boolean, jsonb, jsonb, boolean) to authenticated;

-- Private durable cache for generated reference audio. Only trusted server code
-- uses the service role; no object policies expose learner or provider data.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('linguaai-tts-cache', 'linguaai-tts-cache', false, 10485760, array['audio/wav'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

select 'OK-universal-practice-engine' as migration_proof;
