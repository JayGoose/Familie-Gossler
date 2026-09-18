
-- 004_guest_rpc.sql
create or replace function public.guest_family_snapshot(p_code text)
returns jsonb
language plpgsql security definer set search_path=public
as $$
declare result jsonb;
begin
  if not public.validate_family_day_code(p_code) then
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

grant execute on function public.guest_family_snapshot(text) to anon,authenticated;
