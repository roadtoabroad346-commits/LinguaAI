-- LinguaAI 0017 — security telemetry: devices + security events (idempotent).
-- Run THIS WHOLE FILE in one go (SQL Editor -> New query -> paste all -> Run).
-- Never edit earlier migrations. The trailing OK row proves the full file ran.
--
-- What it stores (base scope, no biometrics):
--   devices: one row per (user, device fingerprint hash) — UA/platform/screen/
--     timezone/language. Lets you see "3 accounts from one phone".
--   security_events: login / device_new / country_change / shared_ip flags with
--     IP + Vercel geo (country/region/city) + user agent. Low volume by design:
--     events are logged only on login and on anomaly-worthy moments, never per request.

-- 0. Devices table.
create table if not exists public.devices (
  id text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  user_agent text,
  platform text,
  screen text,
  timezone text,
  language text,
  created_at timestamptz not null default now()
);
create index if not exists devices_user_seen_idx on public.devices (user_id, last_seen desc);

-- 1. Security events table.
create table if not exists public.security_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  event_type text not null check (event_type in (
    'login', 'signup', 'device_new', 'country_change', 'shared_ip',
    'password_reset', 'oauth_link'
  )),
  ip text,
  country text,
  region text,
  city text,
  user_agent text,
  device_id text references public.devices(id) on delete set null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists security_events_user_created_idx
  on public.security_events (user_id, created_at desc);
create index if not exists security_events_ip_created_idx
  on public.security_events (ip, created_at desc);
create index if not exists security_events_type_created_idx
  on public.security_events (event_type, created_at desc);

-- 2. RLS: owner-only read; inserts only for own user id (server routes use the
-- authenticated user client, so RLS holds; nothing is client-writable directly).
alter table public.devices enable row level security;
alter table public.security_events enable row level security;

drop policy if exists "own devices" on public.devices;
create policy "own devices" on public.devices
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own security events" on public.security_events;
create policy "own security events" on public.security_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 3. Shared-IP check: how many DISTINCT users logged from this IP in the last hour.
-- SECURITY DEFINER (fixed search_path) so the login hook can detect multi-account
-- abuse without granting cross-user read access.
create or replace function public.check_shared_ip(p_ip text)
returns int
language sql
security definer
set search_path = public
as $$
  select count(distinct user_id)::int
  from public.security_events
  where ip = p_ip
    and created_at >= now() - interval '1 hour'
    and user_id is not null;
$$;
revoke all on function public.check_shared_ip(text) from public;
grant execute on function public.check_shared_ip(text) to authenticated;

-- 4. Docs.
comment on table public.devices is 'One row per (user, device fingerprint). Detects account sharing / multi-accounts.';
comment on table public.security_events is 'Low-volume auth security log: logins + anomaly flags (new device/country, shared IP). Never per-request.';
comment on function public.check_shared_ip(text) is 'Distinct users from one IP in the last hour (multi-account signal).';

-- Proof this whole file ran.
select 'OK-0017' as migration,
  (select count(*) from public.devices) as devices,
  (select count(*) from public.security_events) as security_events;
