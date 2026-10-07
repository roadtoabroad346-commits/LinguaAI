-- LinguaAI Phase 3 — vocabulary + dictionary enrichment.
-- Apply in Supabase SQL editor after 0001 → 0002 → 0003, or via `supabase db push`.

-- Word metadata cached from the deterministic bank (so dictionary works offline from the bank).
alter table public.dictionary_entries
  add column if not exists definition text,
  add column if not exists part_of_speech text,
  add column if not exists level text check (level is null or level in ('A1','A2','B1','B2','C1')),
  add column if not exists phonetic text,
  add column if not exists example text,
  add column if not exists translation text,
  add column if not exists source text not null default 'vocabulary',
  add column if not exists review_count int not null default 0,
  add column if not exists correct_count int not null default 0,
  add column if not exists last_reviewed_at timestamptz,
  add column if not exists next_review_at date,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists dictionary_entries_user_review_idx
  on public.dictionary_entries (user_id, next_review_at asc);

create index if not exists dictionary_entries_user_mastery_idx
  on public.dictionary_entries (user_id, mastery desc);

drop trigger if exists dictionary_entries_touch on public.dictionary_entries;
create trigger dictionary_entries_touch before update on public.dictionary_entries
  for each row execute function public.touch_updated_at();

-- RLS policy from 0001 ("own dictionary") already covers the new columns; no new policy needed.
