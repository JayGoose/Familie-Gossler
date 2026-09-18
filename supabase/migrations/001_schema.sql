
-- 001_schema.sql
-- pgcrypto liefert crypt()/gen_salt() (Familientag-Code-Hash). In aktuellen
-- Supabase-Projekten liegt die Extension sonst im Schema "extensions", das
-- NICHT im search_path=public der SECURITY-DEFINER-Funktionen steht -> die
-- Funktionen faenden crypt() nicht. Deshalb explizit ins public-Schema.
create extension if not exists pgcrypto with schema public;

create type public.account_status as enum ('pending','approved','rejected','blocked');
create type public.account_role as enum ('member','admin');
create type public.gender_code as enum ('m','f','u');
create type public.relation_kind as enum ('parent','partner');

create table public.people (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  birth_name text,
  gender gender_code,
  birth_date date,
  death_date date,
  profession text,
  residence text,
  vita_markdown text,
  photo_path text,
  branch text default 'Gossler',
  is_placeholder boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.people_contacts (
  person_id uuid primary key references public.people(id) on delete cascade,
  email text,
  phone text,
  updated_at timestamptz not null default now()
);

create table public.relations (
  id uuid primary key default gen_random_uuid(),
  person_a uuid not null references public.people(id) on delete cascade,
  person_b uuid not null references public.people(id) on delete cascade,
  relation_type relation_kind not null,
  former boolean not null default false,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  constraint no_self_relation check(person_a <> person_b)
);

create unique index relations_unique
on public.relations(person_a,person_b,relation_type,former);

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  person_id uuid references public.people(id) on delete set null,
  status account_status not null default 'pending',
  role account_role not null default 'member',
  created_at timestamptz not null default now(),
  approved_at timestamptz
);

create table public.family_settings (
  id boolean primary key default true check(id=true),
  family_day_code_hash text,
  family_day_code_valid_until date,
  updated_at timestamptz not null default now()
);
insert into public.family_settings(id) values(true) on conflict do nothing;

create table public.usage_events (
  id bigint generated always as identity primary key,
  happened_at timestamptz not null default now(),
  event_name text not null,
  user_id uuid references auth.users(id) on delete set null
);

create view public.people_public as
select p.*,
  exists(select 1 from public.profiles pr where pr.person_id=p.id and pr.status='approved') as is_registered
from public.people p;

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger people_touch before update on public.people
for each row execute function public.touch_updated_at();

create trigger contacts_touch before update on public.people_contacts
for each row execute function public.touch_updated_at();
