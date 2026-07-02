create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'customer' check (role in ('customer', 'admin')),
  daily_image_limit integer not null default 5,
  monthly_image_limit integer not null default 50,
  is_blocked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.design_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text,
  status text not null default 'active' check (status in ('active', 'finalized', 'archived')),
  design_profile jsonb not null default '{}'::jsonb,
  final_design_id uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.design_images (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.design_sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  image_url text not null,
  storage_path text null,
  type text not null check (type in ('generated', 'edited', 'uploaded_reference', 'final')),
  version integer not null default 1,
  parent_id uuid references public.design_images(id) null,
  root_id uuid null,
  variation_name text,
  description text,
  prompt text,
  edit_instruction text,
  model text,
  provider text,
  replicate_prediction_id text,
  is_favorite boolean not null default false,
  is_final boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.design_sessions
  add constraint design_sessions_final_design_id_fkey
  foreign key (final_design_id) references public.design_images(id);

create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  session_id uuid references public.design_sessions(id) null,
  design_image_id uuid references public.design_images(id) null,
  event_type text not null check (event_type in ('chat', 'image_generation', 'image_edit', 'design_brief', 'upload')),
  provider text,
  model text,
  units integer not null default 1,
  estimated_cost numeric(10,4) not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists profiles_role_idx on public.profiles(role);
create index if not exists design_sessions_user_id_idx on public.design_sessions(user_id);
create index if not exists design_images_user_id_idx on public.design_images(user_id);
create index if not exists design_images_session_id_idx on public.design_images(session_id);
create index if not exists usage_events_user_type_created_idx on public.usage_events(user_id, event_type, created_at);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists design_sessions_set_updated_at on public.design_sessions;
create trigger design_sessions_set_updated_at
before update on public.design_sessions
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

alter table public.profiles enable row level security;
alter table public.design_sessions enable row level security;
alter table public.design_images enable row level security;
alter table public.usage_events enable row level security;

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
on public.profiles for select
using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_update_safe_own" on public.profiles;
create policy "profiles_update_safe_own"
on public.profiles for update
using (id = auth.uid())
with check (
  id = auth.uid()
  and role = (select role from public.profiles where id = auth.uid())
  and daily_image_limit = (select daily_image_limit from public.profiles where id = auth.uid())
  and monthly_image_limit = (select monthly_image_limit from public.profiles where id = auth.uid())
  and is_blocked = (select is_blocked from public.profiles where id = auth.uid())
);

drop policy if exists "profiles_admin_update" on public.profiles;
create policy "profiles_admin_update"
on public.profiles for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "sessions_own_or_admin_select" on public.design_sessions;
create policy "sessions_own_or_admin_select"
on public.design_sessions for select
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "sessions_own_insert" on public.design_sessions;
create policy "sessions_own_insert"
on public.design_sessions for insert
with check (user_id = auth.uid());

drop policy if exists "sessions_own_update" on public.design_sessions;
create policy "sessions_own_update"
on public.design_sessions for update
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "images_own_or_admin_select" on public.design_images;
create policy "images_own_or_admin_select"
on public.design_images for select
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "images_own_insert" on public.design_images;
create policy "images_own_insert"
on public.design_images for insert
with check (user_id = auth.uid());

drop policy if exists "images_own_update" on public.design_images;
create policy "images_own_update"
on public.design_images for update
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "usage_own_or_admin_select" on public.usage_events;
create policy "usage_own_or_admin_select"
on public.usage_events for select
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "usage_own_insert" on public.usage_events;
create policy "usage_own_insert"
on public.usage_events for insert
with check (user_id = auth.uid());

insert into storage.buckets (id, name, public)
values ('design-images', 'design-images', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "design_images_storage_select" on storage.objects;
create policy "design_images_storage_select"
on storage.objects for select
using (bucket_id = 'design-images');

drop policy if exists "design_images_storage_insert_own" on storage.objects;
create policy "design_images_storage_insert_own"
on storage.objects for insert
with check (
  bucket_id = 'design-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "design_images_storage_update_own" on storage.objects;
create policy "design_images_storage_update_own"
on storage.objects for update
using (
  bucket_id = 'design-images'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'design-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);
