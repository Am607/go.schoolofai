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
  course_id text,
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

alter table public.resources
add column if not exists course_id text;

-- course_ids replaces course_id, letting a resource page pin multiple
-- courses to the top instead of just one. Backfill from the old column so
-- resources set up before this change keep their existing selection.
alter table public.resources
add column if not exists course_ids text[] not null default '{}';

update public.resources
set course_ids = array[course_id]
where course_id is not null and course_ids = '{}';

alter table public.resources enable row level security;
drop policy if exists "Public can read published resources" on public.resources;
create policy "Public can read published resources" on public.resources for select using (is_published = true);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('resources', 'resources', true, 10485760, array['application/pdf'])
on conflict (id) do update set public = true, file_size_limit = 10485760, allowed_mime_types = array['application/pdf'];

drop policy if exists "Public can download resource PDFs" on storage.objects;
create policy "Public can download resource PDFs" on storage.objects for select using (bucket_id = 'resources');

-- ── Courses (cached from api.schoolofai.so) ─────────────────────────────
-- Populated server-side whenever the live course API is fetched, so the
-- admin dashboard and homepage still have course data if that API is
-- slow, rate-limited, or briefly unreachable.

create table if not exists public.courses (
  id text primary key,
  slug text not null,
  title text not null,
  description text,
  thumbnail_url text,
  modules_count integer not null default 0,
  lessons_count integer not null default 0,
  is_upcoming boolean not null default false,
  rating_avg numeric,
  rating_count integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.courses enable row level security;
drop policy if exists "Public can read courses" on public.courses;
create policy "Public can read courses" on public.courses for select using (true);
-- No insert/update/delete policies: only the service-role key (used by the
-- server-side sync in app/data.ts) can write, bypassing RLS.

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

-- ── Site settings ─────────────────────────────────────────────────────────
-- Single-row table of site-wide toggles. home_course_ids controls which
-- courses (if any) appear in the homepage courses section — admins pick
-- explicit courses rather than the homepage defaulting to "show everything".

create table if not exists public.site_settings (
  id smallint primary key default 1 check (id = 1),
  home_course_ids text[] not null default '{}',
  updated_at timestamptz not null default now()
);

insert into public.site_settings (id) values (1) on conflict (id) do nothing;

alter table public.site_settings enable row level security;
drop policy if exists "Public can read site settings" on public.site_settings;
create policy "Public can read site settings" on public.site_settings for select using (true);

drop policy if exists "Admins can update site settings" on public.site_settings;
create policy "Admins can update site settings" on public.site_settings for update to authenticated using (public.is_admin()) with check (public.is_admin());
