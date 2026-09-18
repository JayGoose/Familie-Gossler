
-- 002_security.sql
alter table public.people enable row level security;
alter table public.people_contacts enable row level security;
alter table public.relations enable row level security;
alter table public.profiles enable row level security;
alter table public.family_settings enable row level security;
alter table public.usage_events enable row level security;

create or replace function public.current_profile()
returns public.profiles
language sql stable security definer set search_path=public
as $$ select * from public.profiles where user_id=auth.uid() $$;

create or replace function public.is_approved()
returns boolean language sql stable security definer set search_path=public
as $$ select coalesce((select status='approved' from public.profiles where user_id=auth.uid()),false) $$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path=public
as $$ select coalesce((select status='approved' and role='admin' from public.profiles where user_id=auth.uid()),false) $$;

-- Authenticated approved members can read family data.
create policy people_read_member on public.people for select
to authenticated using(public.is_approved());

create policy relations_read_member on public.relations for select
to authenticated using(public.is_approved());

create policy contacts_read_member on public.people_contacts for select
to authenticated using(public.is_approved());

-- Members may create placeholders/relations.
create policy people_insert_member on public.people for insert
to authenticated with check(public.is_approved());

create policy relations_insert_member on public.relations for insert
to authenticated with check(public.is_approved());

-- Edit own linked profile, placeholders, or all if admin.
create policy people_update_member on public.people for update
to authenticated using(
  public.is_admin()
  or is_placeholder
  or id=(select person_id from public.profiles where user_id=auth.uid())
);

create policy contacts_write_member on public.people_contacts for all
to authenticated using(
  public.is_admin()
  or person_id=(select person_id from public.profiles where user_id=auth.uid())
) with check(
  public.is_admin()
  or person_id=(select person_id from public.profiles where user_id=auth.uid())
);

create policy relations_delete_member on public.relations for delete
to authenticated using(public.is_admin() or public.is_approved());

create policy people_delete_placeholder on public.people for delete
to authenticated using(public.is_admin() or (public.is_approved() and is_placeholder));

create policy profile_read_self on public.profiles for select
to authenticated using(user_id=auth.uid() or public.is_admin());

create policy profile_update_self on public.profiles for update
to authenticated using(user_id=auth.uid() or public.is_admin());

create policy profile_insert_self on public.profiles for insert
to authenticated with check(user_id=auth.uid());

create policy usage_insert on public.usage_events for insert
to authenticated with check(true);

-- New account bootstrap
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path=public
as $$
begin
  insert into public.profiles(user_id,display_name,status,role)
  values(
    new.id,
    trim(coalesce(new.raw_user_meta_data->>'first_name','') || ' ' || coalesce(new.raw_user_meta_data->>'last_name','')),
    'pending','member'
  );
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- Account can link itself to one person only.
create or replace function public.link_my_profile_to_person(p_person_id uuid)
returns boolean
language plpgsql security definer set search_path=public
as $$
begin
  if not public.is_approved() then raise exception 'not approved'; end if;
  if exists(select 1 from public.profiles where person_id=p_person_id and user_id<>auth.uid() and status='approved')
    then raise exception 'person already linked'; end if;
  update public.profiles set person_id=p_person_id where user_id=auth.uid();
  update public.people set is_placeholder=false where id=p_person_id;
  return true;
end $$;

create or replace function public.create_and_link_my_person(
  p_first_name text,p_last_name text,p_birth_name text,p_gender text,p_branch text
) returns uuid
language plpgsql security definer set search_path=public
as $$
declare v_id uuid;
begin
  if not public.is_approved() then raise exception 'not approved'; end if;
  insert into public.people(first_name,last_name,birth_name,gender,branch,is_placeholder,created_by)
  values(p_first_name,p_last_name,p_birth_name,p_gender::public.gender_code,p_branch,false,auth.uid())
  returning id into v_id;
  update public.profiles set person_id=v_id where user_id=auth.uid();
  return v_id;
end $$;
