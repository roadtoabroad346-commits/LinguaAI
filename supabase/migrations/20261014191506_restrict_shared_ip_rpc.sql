-- Cross-user IP correlation is server-side telemetry. It must not be callable
-- by browser sessions, even though its query is intentionally SECURITY DEFINER.
revoke all on function public.check_shared_ip(text) from public, anon, authenticated;
grant execute on function public.check_shared_ip(text) to service_role;
