-- ============================================================================
-- LinguaAI Flashcards Pro — ONE-STEP database setup.
-- How to apply: open Supabase Dashboard → SQL Editor → New query, paste this
-- ENTIRE file, press Run. Safe to run twice (all statements are IF NOT EXISTS).
-- Applies migrations 0019 (vocab_sets / vocab_cards / vocab_reviews) and
-- 0020 (completion_claims). Preserves all existing user data.
-- Dashboard: https://supabase.com/dashboard/project/ekeubyepwustjhzuthkd/sql/new
-- ============================================================================

-- pgcrypto provides gen_random_uuid() (pre-enabled on Supabase; harmless if present).
create extension if not exists "pgcrypto";

-- LinguaAI 0019 — Flashcards Pro / Custom Vocabulary Studio.
-- Additive only: preserves dictionary_entries (legacy bank saves).
-- New source of truth for personal sets/cards/reviews.
-- Reversible: DROP TABLE vocab_reviews, vocab_cards, vocab_sets (in that order).

create table if not exists public.vocab_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  description text not null default '' check (char_length(description) <= 1000),
  language text not null default 'en' check (char_length(language) between 2 and 32),
  native_language text not null default '' check (char_length(native_language) <= 32),
  level text check (level is null or level in ('A1','A2','B1','B2','C1')),
  category text not null default 'general' check (char_length(category) between 1 and 64),
  color text not null default 'brand' check (color in ('brand','emerald','amber','rose','violet','sky','slate')),
  icon text not null default 'layers' check (char_length(icon) between 1 and 48),
  is_archived boolean not null default false,
  is_favorite boolean not null default false,
  last_studied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vocab_cards (
  id uuid primary key default gen_random_uuid(),
  set_id uuid not null references public.vocab_sets(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  front text not null check (char_length(front) between 1 and 500),
  back text not null check (char_length(back) between 1 and 2000),
  word text not null check (char_length(word) between 1 and 200),
  definition text not null default '' check (char_length(definition) <= 2000),
  example text not null default '' check (char_length(example) <= 2000),
  example_translation text not null default '' check (char_length(example_translation) <= 2000),
  part_of_speech text check (part_of_speech is null or part_of_speech in ('noun','verb','adjective','adverb','phrase','idiom','phrasal-verb','collocation','expression','other')),
  level text check (level is null or level in ('A1','A2','B1','B2','C1')),
  phonetic text not null default '' check (char_length(phonetic) <= 120),
  synonyms text[] not null default '{}',
  antonyms text[] not null default '{}',
  collocations text[] not null default '{}',
  grammar_notes text not null default '' check (char_length(grammar_notes) <= 2000),
  personal_notes text not null default '' check (char_length(personal_notes) <= 2000),
  tags text[] not null default '{}',
  source text not null default 'custom' check (char_length(source) <= 120),
  -- FSRS-lite / SM-2-lite scheduling state (documented in src/lib/vocab-studio/scheduler.ts)
  status text not null default 'new' check (status in ('new','learning','review','relearning','mastered')),
  mastery integer not null default 0 check (mastery between 0 and 100),
  ease_factor double precision not null default 2.5 check (ease_factor between 1.3 and 3.0),
  interval_days integer not null default 0 check (interval_days between 0 and 3650),
  review_count integer not null default 0 check (review_count >= 0),
  correct_count integer not null default 0 check (correct_count >= 0),
  lapses integer not null default 0 check (lapses >= 0),
  last_reviewed_at timestamptz,
  next_review_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vocab_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  card_id uuid not null references public.vocab_cards(id) on delete cascade,
  set_id uuid not null references public.vocab_sets(id) on delete cascade,
  rating text not null check (rating in ('again','hard','good','easy','known','unknown')),
  correct boolean not null,
  prev_mastery integer not null check (prev_mastery between 0 and 100),
  new_mastery integer not null check (new_mastery between 0 and 100),
  prev_interval integer not null default 0,
  new_interval integer not null default 0,
  idempotency_key text not null default '',
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists vocab_sets_user_idx on public.vocab_sets (user_id, updated_at desc);
create index if not exists vocab_sets_user_arch_idx on public.vocab_sets (user_id, is_archived);
create index if not exists vocab_sets_user_fav_idx on public.vocab_sets (user_id, is_favorite);
create index if not exists vocab_cards_set_idx on public.vocab_cards (set_id, created_at desc);
create index if not exists vocab_cards_user_review_idx on public.vocab_cards (user_id, next_review_at asc);
create index if not exists vocab_cards_user_set_word_idx on public.vocab_cards (user_id, set_id, word);
create index if not exists vocab_cards_user_status_idx on public.vocab_cards (user_id, status);
create index if not exists vocab_reviews_card_idx on public.vocab_reviews (card_id, created_at desc);
create index if not exists vocab_reviews_user_idx on public.vocab_reviews (user_id, created_at desc);
create unique index if not exists vocab_reviews_idem_uniq on public.vocab_reviews (user_id, idempotency_key) where (char_length(idempotency_key) > 0);

-- updated_at touch
create or replace function public.touch_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists vocab_sets_touch on public.vocab_sets;
create trigger vocab_sets_touch before update on public.vocab_sets
  for each row execute function public.touch_updated_at();

drop trigger if exists vocab_cards_touch on public.vocab_cards;
create trigger vocab_cards_touch before update on public.vocab_cards
  for each row execute function public.touch_updated_at();

-- RLS: owner-only, deny by default
alter table public.vocab_sets enable row level security;
alter table public.vocab_cards enable row level security;
alter table public.vocab_reviews enable row level security;

drop policy if exists "own vocab_sets" on public.vocab_sets;
create policy "own vocab_sets" on public.vocab_sets for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own vocab_cards" on public.vocab_cards;
create policy "own vocab_cards" on public.vocab_cards for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own vocab_reviews" on public.vocab_reviews;
create policy "own vocab_reviews" on public.vocab_reviews for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

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
