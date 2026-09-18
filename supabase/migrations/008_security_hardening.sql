-- 008_security_hardening.sql
-- Behebt in Task 4 (Security Review) gefundene Lücken. Additiv, ändert keine
-- bestehende Migration. Nach einem Neuaufbau in Reihenfolge 001..008 einspielen.

-- ---------------------------------------------------------------------------
-- FINDING S1 (KRITISCH): View public.people_public umging RLS.
-- Eine normale View läuft mit den Rechten ihres Owners und ist damit ein
-- Loch neben den people-Policies: pending/anon könnten über die View alle
-- Personendaten lesen. api.js liest im Nicht-Gast-Fall direkt aus dieser View.
-- Fix: security_invoker=on (PostgreSQL 15+), damit die View die RLS des
-- AUFRUFERS anwendet (also die people_read_member-Policy: nur is_approved()).
-- ---------------------------------------------------------------------------
alter view public.people_public set (security_invoker = true);

-- Sicherstellen, dass anon die View NICHT lesen darf (nur authenticated,
-- die eigentliche Beschränkung macht dann die RLS auf people via invoker).
revoke all on public.people_public from anon;
grant select on public.people_public to authenticated;

-- ---------------------------------------------------------------------------
-- FINDING S2 (KRITISCH): Familientag-Code ohne Brute-Force-Schutz.
-- validate_family_day_code ist an anon gegranted und beliebig oft aufrufbar.
-- Der Code ist bcrypt-gehasht (gut), aber ohne Ratenbegrenzung durchprobierbar.
-- Fix: Versuchsprotokoll je Client-Fingerprint + harte Sperre bei zu vielen
-- Fehlversuchen pro Zeitfenster. Reine DB-Lösung (kein externer Dienst nötig).
-- ---------------------------------------------------------------------------
create table if not exists public.code_attempts (
  id bigint generated always as identity primary key,
  fingerprint text not null,
  ok boolean not null,
  attempted_at timestamptz not null default now()
);
alter table public.code_attempts enable row level security;
-- Kein direkter Zugriff für Clients; nur SECURITY DEFINER-Funktionen schreiben/lesen.
revoke all on public.code_attempts from anon, authenticated;

create index if not exists code_attempts_fp_time
  on public.code_attempts(fingerprint, attempted_at);

-- Rate-limitierte Prüfung: max. 8 Fehlversuche je Fingerprint in 15 Minuten.
create or replace function public.validate_family_day_code_rl(p_code text, p_fingerprint text)
returns boolean
language plpgsql volatile security definer set search_path=public
as $$
declare
  v_fails int;
  v_ok boolean;
begin
  select count(*) into v_fails
    from public.code_attempts
   where fingerprint = coalesce(p_fingerprint,'anon')
     and ok = false
     and attempted_at > now() - interval '15 minutes';

  if v_fails >= 8 then
    raise exception 'too many attempts, try again later';
  end if;

  v_ok := public.validate_family_day_code(p_code);

  insert into public.code_attempts(fingerprint, ok)
  values (coalesce(p_fingerprint,'anon'), v_ok);

  return v_ok;
end $$;

grant execute on function public.validate_family_day_code_rl(text,text) to anon, authenticated;

-- Auch der Einlöseweg soll rate-limitiert prüfen.
create or replace function public.redeem_family_day_code_rl(p_code text, p_fingerprint text)
returns boolean
language plpgsql volatile security definer set search_path=public
as $$
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if not public.validate_family_day_code_rl(p_code, p_fingerprint) then
    raise exception 'invalid or expired code';
  end if;
  update public.profiles
     set status='approved', approved_at=now()
   where user_id=auth.uid();
  return true;
end $$;

grant execute on function public.redeem_family_day_code_rl(text,text) to authenticated;

-- ---------------------------------------------------------------------------
-- FINDING S3 (MITTEL): usage_events Insert-Policy war with check(true) und
-- erlaubte beliebigen authentifizierten Nutzern beliebige Zeilen (inkl.
-- gefälschter user_id). Schreiben soll nur über die SECURITY DEFINER-Funktion
-- track_usage laufen, die auth.uid() selbst setzt.
-- ---------------------------------------------------------------------------
drop policy if exists usage_insert on public.usage_events;
-- Kein direktes Insert mehr; track_usage (SECURITY DEFINER) bleibt der Weg.
revoke insert on public.usage_events from authenticated;

-- ---------------------------------------------------------------------------
-- FINDING S4 (GERING): create_and_link_my_person legte ein zweites Profil an,
-- selbst wenn das Konto bereits mit einer Person verknüpft war. Schutz gegen
-- versehentliche Dublette.
-- ---------------------------------------------------------------------------
create or replace function public.create_and_link_my_person(
  p_first_name text,p_last_name text,p_birth_name text,p_gender text,p_branch text
) returns uuid
language plpgsql security definer set search_path=public
as $$
declare v_id uuid; v_existing uuid;
begin
  if not public.is_approved() then raise exception 'not approved'; end if;
  select person_id into v_existing from public.profiles where user_id=auth.uid();
  if v_existing is not null then raise exception 'profile already linked'; end if;
  insert into public.people(first_name,last_name,birth_name,gender,branch,is_placeholder,created_by)
  values(p_first_name,p_last_name,p_birth_name,p_gender::public.gender_code,p_branch,false,auth.uid())
  returning id into v_id;
  update public.profiles set person_id=v_id where user_id=auth.uid();
  return v_id;
end $$;
