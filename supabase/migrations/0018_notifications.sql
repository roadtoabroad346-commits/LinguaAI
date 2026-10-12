-- LinguaAI 0018 — notifications center (idempotent, safe to run more than once).
-- Run THIS WHOLE FILE in one go (SQL Editor -> New query -> paste all -> Run).
-- Never edit earlier migrations. The trailing OK row proves the full file ran.
--
-- Design (serverless-safe, no cron required):
--   Notifications are DERIVED from live app state on every read (due reviews,
--   streak risk, unfinished onboarding, ...) and upserted by a stable
--   (user_id, dedupe_key). User actions (read/dismiss/snooze) persist here,
--   so generation never resurrects what the user dismissed and never duplicates.
--   Titles/bodies are stored as i18n KEYS + vars (resolved client-side),
--   so one row serves kk/ru/en without duplication.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  dedupe_key text not null,
  category text not null check (category in (
    'onboarding', 'learning', 'review', 'goal', 'streak',
    'challenge', 'skills', 'milestone', 'weekly', 'system'
  )),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high')),
  title_key text not null,
  body_key text not null,
  vars jsonb not null default '{}'::jsonb,
  href text not null default '/dashboard',
  read_at timestamptz,
  dismissed_at timestamptz,
  snoozed_until timestamptz,
  resolved_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, dedupe_key)
);
create index if not exists notifications_user_state_idx
  on public.notifications (user_id, created_at desc);
create index if not exists notifications_user_unread_idx
  on public.notifications (user_id) where read_at is null and dismissed_at is null and resolved_at is null;

alter table public.notifications enable row level security;
drop policy if exists "own notifications" on public.notifications;
create policy "own notifications" on public.notifications
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

comment on table public.notifications is 'User notification center: state-derived rows (stable dedupe_key), user-owned; titles are i18n keys + vars.';
comment on column public.notifications.dedupe_key is 'Stable generation key (e.g. goal:2026-10-13). Re-generation upserts, never duplicates; dismissal persists.';

-- Proof this whole file ran.
select 'OK-0018' as migration,
  (select count(*) from public.notifications) as notifications;
