-- LinguaAI 0023 — telemetry RLS tightening (idempotent, additive only).
-- Run THIS WHOLE FILE in one go (SQL Editor -> New query -> paste all -> Run).
-- Apply 0001 -> 0023 in order for fresh projects. Never edit earlier migrations.
--
-- security_events is an append-only forensic log: owners keep SELECT + INSERT,
-- UPDATE/DELETE are revoked so a compromised session cannot rewrite history.
-- devices keeps SELECT + INSERT + UPDATE (last_seen heartbeat via upsert)
-- but loses DELETE so device history cannot be wiped to hide sharing.

-- 1. security_events: drop FOR ALL, recreate as SELECT + INSERT only.
drop policy if exists "own security events" on public.security_events;
drop policy if exists "own security_events read" on public.security_events;
drop policy if exists "own security_events insert" on public.security_events;

create policy "own security_events read" on public.security_events
  for select using ((select auth.uid()) = user_id);
create policy "own security_events insert" on public.security_events
  for insert with check ((select auth.uid()) = user_id);

-- 2. devices: drop FOR ALL, recreate as SELECT + INSERT + UPDATE (no DELETE).
drop policy if exists "own devices" on public.devices;
drop policy if exists "own devices read" on public.devices;
drop policy if exists "own devices insert" on public.devices;
drop policy if exists "own devices update" on public.devices;

create policy "own devices read" on public.devices
  for select using ((select auth.uid()) = user_id);
create policy "own devices insert" on public.devices
  for insert with check ((select auth.uid()) = user_id);
create policy "own devices update" on public.devices
  for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Proof this whole file ran.
select 'OK-0023' as migration;
