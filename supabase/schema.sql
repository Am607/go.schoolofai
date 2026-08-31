create extension if not exists "pgcrypto";

-- ── Resources ────────────────────────────────────────────────────────────

create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null,
  type text not null default 'bundle' check (type in ('prompt', 'pdf', 'article', 'bundle')),
  content text,
  file_url text,
  pdf_url text,
  article_url text,
  referral_code text unique,
  is_featured boolean not null default false,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  constraint resource_payload check (
    (type = 'prompt' and content is not null) or
    (type in ('pdf', 'article') and file_url is not null) or
    (type = 'bundle' and (content is not null or pdf_url is not null or article_url is not null))
  )
);

alter table public.resources
add column if not exists referral_code text unique;

alter table public.resources enable row level security;
drop policy if exists "Public can read published resources" on public.resources;
create policy "Public can read published resources" on public.resources for select using (is_published = true);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('resources', 'resources', true, 10485760, array['application/pdf'])
on conflict (id) do update set public = true, file_size_limit = 10485760, allowed_mime_types = array['application/pdf'];

drop policy if exists "Public can download resource PDFs" on storage.objects;
create policy "Public can download resource PDFs" on storage.objects for select using (bucket_id = 'resources');

-- ── Profiles / admin users ──────────────────────────────────────────────
-- One row per auth.users id. role = 'admin' grants access to the admin
-- dashboard and write access to resources (see policies below).

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile" on public.profiles for select using ((select auth.uid()) = id);

create or replace function public.is_admin()
returns boolean
language sql
security invoker
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

-- ── Admin write access ───────────────────────────────────────────────────

drop policy if exists "Admins can insert resources" on public.resources;
create policy "Admins can insert resources" on public.resources for insert to authenticated with check (public.is_admin());

drop policy if exists "Admins can update resources" on public.resources;
create policy "Admins can update resources" on public.resources for update to authenticated using (public.is_admin());

drop policy if exists "Admins can delete resources" on public.resources;
create policy "Admins can delete resources" on public.resources for delete to authenticated using (public.is_admin());

drop policy if exists "Admins can upload resource files" on storage.objects;
create policy "Admins can upload resource files" on storage.objects for insert to authenticated with check (bucket_id = 'resources' and public.is_admin());

drop policy if exists "Admins can delete resource files" on storage.objects;
create policy "Admins can delete resource files" on storage.objects for delete to authenticated using (bucket_id = 'resources' and public.is_admin());
