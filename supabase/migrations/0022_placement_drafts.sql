-- LinguaAI 0022 — server-side placement drafts (multi-device resume, idempotent).
-- Run THIS WHOLE FILE in one go (SQL Editor -> New query -> paste all -> Run).
-- Apply 0001 -> 0022 in order for fresh projects. Never edit earlier migrations.
-- Additive only. Local localStorage drafts keep working offline; the server
-- draft is the authoritative in-progress copy when signed in.

create table if not exists public.placement_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  attempt_key text not null check (char_length(attempt_key) between 4 and 120),
  status text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  section_index int not null default 0 check (section_index >= 0 and section_index < 20),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint placement_drafts_user_attempt_uniq unique (user_id, attempt_key)
);

create index if not exists placement_drafts_user_updated_idx
  on public.placement_drafts (user_id, updated_at desc);

create index if not exists placement_drafts_user_status_idx
  on public.placement_drafts (user_id, status);

-- updated_at auto-touch (reuse helper when present, else inline trigger).
do $$
begin
  if exists (select 1 from pg_proc where proname = 'touch_updated_at') then
    drop trigger if exists placement_drafts_touch on public.placement_drafts;
    create trigger placement_drafts_touch
      before update on public.placement_drafts
      for each row execute function public.touch_updated_at();
  else
    drop trigger if exists placement_drafts_touch on public.placement_drafts;
    create trigger placement_drafts_touch
      before update on public.placement_drafts
      for each row execute function public.set_updated_at();
  end if;
exception when others then
  -- helpers missing on very old backends: updated_at still set by API.
  null;
end;
$$;

alter table public.placement_drafts enable row level security;

drop policy if exists "own placement_drafts" on public.placement_drafts;
create policy "own placement_drafts" on public.placement_drafts
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Proof this whole file ran (if you do not see OK-0022, the paste was truncated).
select 'OK-0022' as migration;
