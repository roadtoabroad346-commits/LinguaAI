-- LinguaAI Phase 5 — writing submissions + error tracking + AI teacher history.
-- Apply after 0001 → 0005, or via `supabase db push`.

create table if not exists public.writing_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  task_slug text not null,
  level text not null default 'A1',
  text text not null,
  word_count int not null default 0 check (word_count >= 0),
  score int not null default 0 check (score >= 0 and score <= 100),
  feedback jsonb not null default '[]'::jsonb,
  improved_text text not null default '',
  xp_earned int not null default 0 check (xp_earned >= 0 and xp_earned <= 100),
  ai boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists writing_submissions_user_idx
  on public.writing_submissions (user_id, created_at desc);

create table if not exists public.writing_errors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  submission_id uuid not null references public.writing_submissions(id) on delete cascade,
  category text not null check (category in ('spelling','grammar','punctuation','style','vocabulary')),
  message text not null,
  snippet text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists writing_errors_user_idx
  on public.writing_errors (user_id, created_at desc);
create index if not exists writing_errors_user_category_idx
  on public.writing_errors (user_id, category);

create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  created_at timestamptz not null default now()
);
create index if not exists ai_messages_user_idx
  on public.ai_messages (user_id, created_at desc);

alter table public.writing_submissions enable row level security;
alter table public.writing_errors enable row level security;
alter table public.ai_messages enable row level security;

drop policy if exists "own writing submissions" on public.writing_submissions;
create policy "own writing submissions" on public.writing_submissions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own writing errors" on public.writing_errors;
create policy "own writing errors" on public.writing_errors
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own ai messages" on public.ai_messages;
create policy "own ai messages" on public.ai_messages
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
