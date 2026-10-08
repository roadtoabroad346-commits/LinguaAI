-- LinguaAI Phase 12 — pronunciation progress.
-- Widens skill_attempts.skill to cover pronunciation + productive skills
-- (previously only grammar/reading/listening/dictation were allowed).
-- Idempotent: safe to rerun via `supabase db push` or the SQL editor.

do $$
begin
  if exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public' and table_name = 'skill_attempts'
      and constraint_name = 'skill_attempts_skill_check'
  ) then
    alter table public.skill_attempts drop constraint skill_attempts_skill_check;
  end if;
end $$;

alter table public.skill_attempts
  add constraint skill_attempts_skill_check
  check (skill in (
    'grammar','reading','listening','dictation',
    'pronunciation','speaking','writing','spelling','vocabulary'
  ));

create index if not exists skill_attempts_user_skill_idx
  on public.skill_attempts (user_id, skill, created_at desc);
create index if not exists skill_attempts_user_slug_idx
  on public.skill_attempts (user_id, skill, slug, created_at desc);
