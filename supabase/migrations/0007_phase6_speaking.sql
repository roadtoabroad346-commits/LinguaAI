-- LinguaAI Phase 6 — speaking + read aloud attempts.
-- Apply after 0001 → 0006, or via `supabase db push`.

create table if not exists public.speaking_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  topic_slug text not null,
  level text not null default 'A1',
  transcript text not null default '',
  word_count int not null default 0 check (word_count >= 0),
  duration_secs int not null default 0 check (duration_secs >= 0 and duration_secs <= 3600),
  score int not null default 0 check (score >= 0 and score <= 100),
  feedback jsonb not null default '[]'::jsonb,
  xp_earned int not null default 0 check (xp_earned >= 0 and xp_earned <= 1000),
  ai boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists speaking_attempts_user_idx
  on public.speaking_attempts (user_id, created_at desc);
create index if not exists speaking_attempts_user_topic_idx
  on public.speaking_attempts (user_id, topic_slug, created_at desc);

create table if not exists public.read_aloud_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  passage_slug text not null,
  level text not null default 'A1',
  transcript text not null default '',
  accuracy int not null default 0 check (accuracy >= 0 and accuracy <= 100),
  wpm int not null default 0 check (wpm >= 0 and wpm <= 600),
  score int not null default 0 check (score >= 0 and score <= 100),
  missed_words jsonb not null default '[]'::jsonb,
  xp_earned int not null default 0 check (xp_earned >= 0 and xp_earned <= 1000),
  ai boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists read_aloud_attempts_user_idx
  on public.read_aloud_attempts (user_id, created_at desc);
create index if not exists read_aloud_attempts_user_passage_idx
  on public.read_aloud_attempts (user_id, passage_slug, created_at desc);

alter table public.speaking_attempts enable row level security;
drop policy if exists "own speaking attempts" on public.speaking_attempts;
create policy "own speaking attempts" on public.speaking_attempts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.read_aloud_attempts enable row level security;
drop policy if exists "own read aloud attempts" on public.read_aloud_attempts;
create policy "own read aloud attempts" on public.read_aloud_attempts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
