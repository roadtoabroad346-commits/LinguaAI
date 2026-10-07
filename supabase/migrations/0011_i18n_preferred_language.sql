-- LinguaAI i18n: interface-language preference (kk | ru | en).
-- Priority: user setting → local preference → browser language → English.

alter table public.profiles
  add column if not exists preferred_language text not null default 'en';

-- Constrain to supported interface languages (keep permissive for forward-compat:
-- check allows only the three shipped locales).
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_preferred_language_check'
  ) then
    alter table public.profiles
      add constraint profiles_preferred_language_check
      check (preferred_language in ('kk', 'ru', 'en'));
  end if;
end $$;
