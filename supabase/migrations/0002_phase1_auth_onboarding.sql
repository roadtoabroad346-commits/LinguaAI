-- LinguaAI Phase 1 — auth + onboarding + placement
-- Profiles already exist (0001). This migration adds onboarding fields + placement results.
-- Apply in Supabase SQL editor or via `supabase db push`.

alter table public.profiles
  add column if not exists onboarding_completed boolean not null default false,
  add column if not exists native_language text,
  add column if not exists goals text[] not null default '{}',
  add column if not exists placement_score int check (placement_score is null or (placement_score >= 0 and placement_score <= 100)),
  add column if not exists placement_taken_at timestamptz;

create table if not exists public.placement_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  score int not null check (score >= 0),
  total int not null check (total > 0),
  level text not null check (level in ('A1','A2','B1','B2','C1')),
  answers jsonb not null default '[]',
  created_at timestamptz not null default now()
);
create index if not exists placement_results_user_created_idx
  on public.placement_results (user_id, created_at desc);

alter table public.placement_results enable row level security;
drop policy if exists "own placement results" on public.placement_results;
create policy "own placement results" on public.placement_results
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
