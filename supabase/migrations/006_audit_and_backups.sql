
-- 006_audit_and_backups.sql
create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  happened_at timestamptz not null default now(),
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb
);

alter table public.audit_log enable row level security;

create policy audit_admin_read on public.audit_log for select
to authenticated using(public.is_admin());

create or replace function public.audit_event(
  p_action text,
  p_entity_type text default null,
  p_entity_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
) returns boolean
language plpgsql security definer set search_path=public
as $$
begin
  insert into public.audit_log(user_id,action,entity_type,entity_id,metadata)
  values(auth.uid(),p_action,p_entity_type,p_entity_id,coalesce(p_metadata,'{}'::jsonb));
  return true;
end $$;

grant execute on function public.audit_event(text,text,uuid,jsonb) to authenticated;

create or replace function public.admin_export_family()
returns jsonb
language plpgsql security definer set search_path=public
as $$
declare result jsonb;
begin
  if not public.is_admin() then raise exception 'admin only'; end if;

  select jsonb_build_object(
    'exported_at', now(),
    'people', (select coalesce(jsonb_agg(to_jsonb(p)),'[]'::jsonb) from public.people p),
    'contacts', (select coalesce(jsonb_agg(to_jsonb(c)),'[]'::jsonb) from public.people_contacts c),
    'relations', (select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) from public.relations r),
    'profiles', (select coalesce(jsonb_agg(to_jsonb(pr)),'[]'::jsonb) from public.profiles pr)
  ) into result;

  perform public.audit_event('admin_export_family','system',null,'{}'::jsonb);
  return result;
end $$;
