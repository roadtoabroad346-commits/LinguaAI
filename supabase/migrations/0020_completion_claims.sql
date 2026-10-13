-- LinguaAI 0020 — idempotent completion claims (anti double-XP).
-- Additive only. Gives every XP-bearing completion endpoint an optional
-- client-provided idempotency key with a UNIQUE(user_id, scope, key) guard,
-- so retries / double-submits / concurrent posts award XP exactly once.
-- Reversible: DROP TABLE public.completion_claims.

create table if not exists public.completion_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scope text not null check (char_length(scope) between 1 and 64),
  key text not null check (char_length(key) between 8 and 120),
  created_at timestamptz not null default now()
);

create unique index if not exists completion_claims_user_scope_key_uniq
  on public.completion_claims (user_id, scope, key);

create index if not exists completion_claims_user_idx
  on public.completion_claims (user_id, created_at desc);

alter table public.completion_claims enable row level security;

drop policy if exists "own completion_claims" on public.completion_claims;
create policy "own completion_claims" on public.completion_claims
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
