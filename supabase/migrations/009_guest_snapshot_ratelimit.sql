-- 009_guest_snapshot_ratelimit.sql
-- Behebt das Release-Finding (MEDIUM): guest_family_snapshot prüfte den
-- Familientag-Code intern über die NICHT rate-limitierte validate_family_day_code.
-- Der Client-Flow (api.js) validiert zwar zuvor über validate_family_day_code_rl,
-- aber ein direkter RPC-Aufruf des Snapshots umging die Ratenbegrenzung und war
-- damit brute-forcebar.
--
-- Additiv, ändert keine bestehende Migration (Regel: neue Migration statt
-- Umschreiben). Nach 001..008 in Reihenfolge einspielen.
--
-- Neue Signatur mit p_fingerprint: der Snapshot leitet die Code-Prüfung selbst
-- durch validate_family_day_code_rl (max. 8 Fehlversuche je Fingerprint / 15 min,
-- siehe 008). Damit ist AUCH der direkte Snapshot-Aufruf rate-limitiert.

create or replace function public.guest_family_snapshot(p_code text, p_fingerprint text)
returns jsonb
language plpgsql security definer set search_path=public
as $$
declare result jsonb;
begin
  -- Rate-limitierte Prüfung (wirft bei zu vielen Fehlversuchen selbst).
  if not public.validate_family_day_code_rl(p_code, p_fingerprint) then
    raise exception 'invalid or expired code';
  end if;

  select jsonb_build_object(
    'people', coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb),
    'relations', (select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) from public.relations r)
  ) into result
  from (
    select id,first_name,last_name,birth_name,gender,birth_date,death_date,
           profession,residence,vita_markdown,photo_path,branch,is_placeholder
    from public.people
  ) x;

  return result;
end $$;

grant execute on function public.guest_family_snapshot(text,text) to anon,authenticated;

-- Die alte, NICHT rate-limitierte 1-Argument-Variante wird entzogen, damit sie
-- nicht als Umgehung des Limits bestehen bleibt. (Die Funktion existiert nach
-- diesem DROP nur noch in der 2-Argument-Form.)
drop function if exists public.guest_family_snapshot(text);
