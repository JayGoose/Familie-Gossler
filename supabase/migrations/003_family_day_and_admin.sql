
-- 003_family_day_and_admin.sql
-- NOTE: Guest mode cannot rely on direct table RLS because guests are anonymous.
-- The app uses a server-validated code + RPC functions returning sanitized data.

create or replace function public.validate_family_day_code(p_code text)
returns boolean
language sql stable security definer set search_path=public
as $$
select coalesce(
  crypt(p_code, family_day_code_hash)=family_day_code_hash
  and (family_day_code_valid_until is null or family_day_code_valid_until >= current_date),
  false
)
from public.family_settings where id=true
$$;

create or replace function public.redeem_family_day_code(p_code text)
returns boolean
language plpgsql security definer set search_path=public
as $$
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if not public.validate_family_day_code(p_code) then raise exception 'invalid or expired code'; end if;
  update public.profiles
     set status='approved', approved_at=now()
   where user_id=auth.uid();
  return true;
end $$;

create or replace function public.admin_set_family_day_code(p_code text,p_valid_until date)
returns boolean
language plpgsql security definer set search_path=public
as $$
begin
  if not public.is_admin() then raise exception 'admin only'; end if;
  update public.family_settings
     set family_day_code_hash=case when nullif(p_code,'') is null then null else crypt(p_code,gen_salt('bf')) end,
         family_day_code_valid_until=p_valid_until,
         updated_at=now()
   where id=true;
  return true;
end $$;

create or replace function public.admin_get_family_day_code()
returns table(code text,valid_until date)
language sql security definer set search_path=public
as $$
select '••••••••'::text,family_day_code_valid_until
from public.family_settings
where id=true and public.is_admin()
$$;

create or replace function public.admin_list_profiles()
returns table(user_id uuid,email text,display_name text,person_id uuid,status text,role text)
language sql security definer set search_path=public
as $$
select p.user_id,u.email,p.display_name,p.person_id,p.status::text,p.role::text
from public.profiles p
join auth.users u on u.id=p.user_id
where public.is_admin()
order by p.created_at desc
$$;

create or replace function public.admin_set_profile_status(
 p_user_id uuid,p_status text,p_role text,p_person_id uuid
) returns boolean
language plpgsql security definer set search_path=public
as $$
begin
 if not public.is_admin() then raise exception 'admin only'; end if;
 update public.profiles
 set status=p_status::public.account_status,
     role=p_role::public.account_role,
     person_id=coalesce(p_person_id,person_id),
     approved_at=case when p_status='approved' then now() else approved_at end
 where user_id=p_user_id;
 return true;
end $$;

create or replace function public.track_usage(p_event text)
returns boolean
language plpgsql security definer set search_path=public
as $$
begin
 insert into public.usage_events(event_name,user_id) values(p_event,auth.uid());
 return true;
end $$;

create or replace function public.admin_usage_last_14_days()
returns table(day date,count bigint)
language sql security definer set search_path=public
as $$
select happened_at::date,count(*)
from public.usage_events
where public.is_admin() and happened_at>=current_date-13
group by 1 order by 1
$$;

grant execute on function public.validate_family_day_code(text) to anon,authenticated;
grant execute on function public.redeem_family_day_code(text) to authenticated;
