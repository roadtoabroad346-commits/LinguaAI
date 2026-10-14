-- XP awards are server-authoritative. Browser JWTs must not be able to invoke
-- this function directly with a self-selected amount or timestamp.
create or replace function public.award_xp_atomic(
  p_user_id uuid,
  p_amount integer,
  p_source text,
  p_activity_kind text default null,
  p_activity_title text default null,
  p_activity_href text default null,
  p_now timestamptz default now()
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_profile public.profiles%rowtype;
  v_timezone text;
  v_today date;
  v_day_start timestamptz;
  v_current integer;
  v_longest integer;
  v_xp_today integer;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if p_amount is null or p_amount < 1 or p_amount > 1000 then
    raise exception 'invalid XP amount' using errcode = '22023';
  end if;
  if p_source is null or btrim(p_source) = '' or char_length(p_source) > 120 then
    raise exception 'invalid XP source' using errcode = '22023';
  end if;

  select * into v_profile
  from public.profiles
  where id = p_user_id
  for update;
  if not found then
    raise exception 'profile not found' using errcode = 'P0002';
  end if;

  select coalesce(
    (select name from pg_catalog.pg_timezone_names where name = v_profile.timezone limit 1),
    'UTC'
  ) into v_timezone;
  v_today := (p_now at time zone v_timezone)::date;
  v_day_start := v_today::timestamp at time zone v_timezone;

  if v_profile.last_active_date = v_today then
    v_current := greatest(v_profile.current_streak, 1);
  elsif v_profile.last_active_date = v_today - 1 then
    v_current := greatest(v_profile.current_streak, 0) + 1;
  else
    v_current := 1;
  end if;
  v_longest := greatest(v_profile.longest_streak, v_current);

  insert into public.xp_events (user_id, amount, source)
  values (p_user_id, p_amount, left(btrim(p_source), 120));

  if p_activity_kind is not null and p_activity_title is not null then
    insert into public.activity_events (user_id, kind, title, subtitle, href, xp)
    values (
      p_user_id,
      left(btrim(p_activity_kind), 120),
      left(btrim(p_activity_title), 500),
      null,
      nullif(left(btrim(coalesce(p_activity_href, '')), 500), ''),
      p_amount
    );
  end if;

  update public.profiles
  set total_xp = coalesce(total_xp, 0) + p_amount,
      current_streak = v_current,
      longest_streak = v_longest,
      last_active_date = v_today
  where id = p_user_id;

  select coalesce(sum(amount), 0)::integer into v_xp_today
  from public.xp_events
  where user_id = p_user_id and created_at >= v_day_start;

  return jsonb_build_object(
    'streak', jsonb_build_object('current', v_current, 'longest', v_longest),
    'xpToday', v_xp_today
  );
end;
$$;

revoke all on function public.award_xp_atomic(uuid, integer, text, text, text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.award_xp_atomic(uuid, integer, text, text, text, text, timestamptz) to service_role;

comment on function public.award_xp_atomic(uuid, integer, text, text, text, text, timestamptz)
is 'Server-only: atomically inserts XP/activity and increments profile XP/streak counters.';
