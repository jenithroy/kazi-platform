-- Migration: SEO content management for the /admin area
--
-- Stories (blog posts), per-page SEO overrides, site-wide SEO settings, redirects and a
-- publish log. Everything here is edited from /admin and read at build time by the static
-- export (lib/cms.js), so public reads go through the anon key and only ever see what is
-- live.
--
-- It also closes two privilege-escalation holes in the existing profiles setup, since every
-- write policy below keys off profiles.role:
--   * handle_new_user() copied `role` out of raw_user_meta_data, which the browser controls
--     (supabase.auth.signUp({ options: { data: { role: "admin" } } })) — anyone could
--     register as an admin.
--   * "Users can update own profile" has no column restriction, so any signed-in user could
--     run `update profiles set role = 'admin' where id = auth.uid()`.
-- And it replaces the profiles policies that query profiles from inside a profiles policy,
-- which Postgres rejects as infinite recursion as soon as a signed-in user reads the table.
--
-- Safe to re-run: tables use IF NOT EXISTS, policies and triggers are dropped first.

-- ---------------------------------------------------------------------------------------
-- Role helpers
-- ---------------------------------------------------------------------------------------
-- SECURITY DEFINER so they can read profiles without going back through its RLS policies.

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('employee', 'admin')
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

revoke all on function public.is_staff() from public;
revoke all on function public.is_admin() from public;
grant execute on function public.is_staff() to anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;

-- ---------------------------------------------------------------------------------------
-- Role hardening
-- ---------------------------------------------------------------------------------------

-- New sign-ups are always customers. The bootstrap admin email from 005 still applies; any
-- other admin is promoted by an existing admin, or from the SQL editor:
--   update public.profiles set role = 'admin' where email = 'you@example.com';
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  user_role text := 'customer';
begin
  if new.email = 'finnqrk@gmail.com' then
    user_role := 'admin';
  end if;
  insert into public.profiles (id, email, role, full_name, company_name)
  values (
    new.id,
    new.email,
    user_role,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'company_name'
  );
  return new;
end;
$$;

-- Role changes made through the API need an admin. Direct SQL sessions (dashboard SQL
-- editor, service role, migrations) aren't running as anon/authenticated and pass through.
-- SECURITY INVOKER on purpose: current_user has to be the caller's role, not the owner's.
create or replace function public.guard_profile_role()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.role is distinct from old.role
     and current_user in ('anon', 'authenticated')
     and not public.is_admin() then
    raise exception 'Only an admin can change a profile''s role'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_profile_role on public.profiles;
create trigger guard_profile_role
  before update of role on public.profiles
  for each row execute function public.guard_profile_role();

drop policy if exists "Employees and admins can view all profiles" on public.profiles;
create policy "Employees and admins can view all profiles"
  on public.profiles for select
  using (public.is_staff());

drop policy if exists "Admins can update all profiles" on public.profiles;
create policy "Admins can update all profiles"
  on public.profiles for update
  using (public.is_admin());

drop policy if exists "Admins can insert profiles" on public.profiles;
create policy "Admins can insert profiles"
  on public.profiles for insert
  with check (public.is_admin());

-- ---------------------------------------------------------------------------------------
-- Shared trigger functions
-- ---------------------------------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- One row that records when any published content last changed (inserts, edits and
-- deletes alike), so /admin can tell whether the live build is behind.
create table if not exists public.site_status (
  id boolean primary key default true check (id),
  content_updated_at timestamptz not null default now()
);

insert into public.site_status (id) values (true) on conflict (id) do nothing;

create or replace function public.touch_site_content()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.site_status set content_updated_at = now() where id;
  return null;
end;
$$;

-- ---------------------------------------------------------------------------------------
-- Redirects (written to the Cloudflare Pages _redirects file at build time)
-- ---------------------------------------------------------------------------------------

create table if not exists public.redirects (
  id uuid primary key default gen_random_uuid(),
  from_path text not null unique check (from_path ~ '^/\S*$' and from_path <> '/'),
  to_path text not null check (to_path ~ '^(/|https?://)\S*$'),
  status_code integer not null default 301 check (status_code in (301, 302, 307, 308)),
  note text,
  created_by uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint redirects_not_to_self check (from_path <> to_path)
);

-- ---------------------------------------------------------------------------------------
-- Stories (blog posts, published at /stories/<slug>/)
-- ---------------------------------------------------------------------------------------
-- status 'published' with a future published_at is a scheduled post: it isn't readable
-- publicly (so the build leaves it out) until that time has passed and the site rebuilds.

create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 100),
  title text not null check (char_length(title) between 1 and 200),
  excerpt text,
  content text not null default '',
  cover_image_url text,
  cover_image_alt text,
  category text,
  tags text[] not null default '{}',
  author_name text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  featured boolean not null default false,
  seo_title text,
  seo_description text,
  focus_keyword text,
  canonical_url text,
  og_image_url text,
  noindex boolean not null default false,
  faqs jsonb not null default '[]'::jsonb check (jsonb_typeof(faqs) = 'array'),
  created_by uuid default auth.uid() references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint blog_posts_published_has_date check (status <> 'published' or published_at is not null)
);

create index if not exists idx_blog_posts_live
  on public.blog_posts (published_at desc)
  where status = 'published';

create or replace function public.stamp_blog_post_editor()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_by := coalesce(auth.uid(), new.updated_by);
  return new;
end;
$$;

-- Keeps old story URLs working: renaming a live story's slug 301s the old URL to the new
-- one (re-pointing any redirect that led to the old URL, so there are no chains), and
-- deleting a live story 301s its URL to the stories index. A story that goes live clears
-- any redirect sitting on its own URL, which would otherwise shadow it.
-- SECURITY DEFINER because redirects are admin-only and employees edit stories too.
create or replace function public.redirect_story_urls()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  was_live boolean;
  old_path text;
  new_path text;
begin
  if tg_op in ('UPDATE', 'DELETE') then
    was_live := old.status = 'published' and old.published_at <= now();
    old_path := '/stories/' || old.slug || '/';
  end if;

  if tg_op = 'DELETE' then
    if was_live then
      update public.redirects set to_path = '/stories/', updated_at = now()
        where to_path = old_path;
      insert into public.redirects (from_path, to_path, status_code, note)
        values (old_path, '/stories/', 301, 'Automatic: story deleted')
        on conflict (from_path) do update
          set to_path = excluded.to_path, status_code = 301, note = excluded.note, updated_at = now();
    end if;
    return old;
  end if;

  new_path := '/stories/' || new.slug || '/';

  if new.status = 'published' then
    delete from public.redirects
      where from_path in (new_path, '/stories/' || new.slug);
  end if;

  if tg_op = 'UPDATE' and was_live and new.slug is distinct from old.slug then
    update public.redirects set to_path = new_path, updated_at = now()
      where to_path = old_path;
    insert into public.redirects (from_path, to_path, status_code, note)
      values (old_path, new_path, 301, 'Automatic: story URL changed')
      on conflict (from_path) do update
        set to_path = excluded.to_path, status_code = 301, note = excluded.note, updated_at = now();
  end if;

  return new;
end;
$$;

drop trigger if exists blog_posts_touch_updated_at on public.blog_posts;
create trigger blog_posts_touch_updated_at
  before update on public.blog_posts
  for each row execute function public.touch_updated_at();

drop trigger if exists blog_posts_stamp_editor on public.blog_posts;
create trigger blog_posts_stamp_editor
  before insert or update on public.blog_posts
  for each row execute function public.stamp_blog_post_editor();

drop trigger if exists blog_posts_redirect_urls on public.blog_posts;
create trigger blog_posts_redirect_urls
  after insert or update or delete on public.blog_posts
  for each row execute function public.redirect_story_urls();

-- ---------------------------------------------------------------------------------------
-- Per-page SEO overrides for the code-defined pages (keys match lib/seo-routes.js)
-- ---------------------------------------------------------------------------------------

create table if not exists public.seo_pages (
  path text primary key check (path ~ '^/\S*$'),
  title text,
  description text,
  og_image_url text,
  noindex boolean not null default false,
  updated_by uuid default auth.uid() references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

drop trigger if exists seo_pages_touch_updated_at on public.seo_pages;
create trigger seo_pages_touch_updated_at
  before update on public.seo_pages
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------------------
-- Site-wide SEO settings (single row). Empty columns fall back to the defaults in code.
-- ---------------------------------------------------------------------------------------

create table if not exists public.seo_settings (
  id boolean primary key default true check (id),
  default_description text,
  default_og_image_url text,
  org_name text,
  org_email text,
  org_phone text,
  org_street_address text,
  org_locality text,
  org_region text,
  org_postal_code text,
  org_country text,
  org_logo_url text,
  same_as text[] not null default '{}',
  google_site_verification text,
  bing_site_verification text,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.seo_settings (id) values (true) on conflict (id) do nothing;

drop trigger if exists seo_settings_touch_updated_at on public.seo_settings;
create trigger seo_settings_touch_updated_at
  before update on public.seo_settings
  for each row execute function public.touch_updated_at();

drop trigger if exists redirects_touch_updated_at on public.redirects;
create trigger redirects_touch_updated_at
  before update on public.redirects
  for each row execute function public.touch_updated_at();

-- Content-change tracking for the "unpublished changes" indicator in /admin.
drop trigger if exists blog_posts_touch_site on public.blog_posts;
create trigger blog_posts_touch_site
  after insert or update or delete on public.blog_posts
  for each statement execute function public.touch_site_content();

drop trigger if exists seo_pages_touch_site on public.seo_pages;
create trigger seo_pages_touch_site
  after insert or update or delete on public.seo_pages
  for each statement execute function public.touch_site_content();

drop trigger if exists seo_settings_touch_site on public.seo_settings;
create trigger seo_settings_touch_site
  after insert or update or delete on public.seo_settings
  for each statement execute function public.touch_site_content();

drop trigger if exists redirects_touch_site on public.redirects;
create trigger redirects_touch_site
  after insert or update or delete on public.redirects
  for each statement execute function public.touch_site_content();

-- ---------------------------------------------------------------------------------------
-- Publish log (written by the request-deploy edge function)
-- ---------------------------------------------------------------------------------------

create table if not exists public.site_deploys (
  id uuid primary key default gen_random_uuid(),
  requested_by uuid default auth.uid() references public.profiles(id) on delete set null,
  ok boolean not null,
  message text,
  created_at timestamptz not null default now()
);

create index if not exists idx_site_deploys_created_at on public.site_deploys (created_at desc);

-- ---------------------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------------------
-- Stories, media and publishing: staff (employees and admins).
-- Page overrides, site settings and redirects: admins only.

alter table public.blog_posts enable row level security;
alter table public.seo_pages enable row level security;
alter table public.seo_settings enable row level security;
alter table public.redirects enable row level security;
alter table public.site_deploys enable row level security;
alter table public.site_status enable row level security;

drop policy if exists "Live stories are public" on public.blog_posts;
create policy "Live stories are public"
  on public.blog_posts for select
  to anon, authenticated
  using (status = 'published' and published_at <= now());

drop policy if exists "Staff can read all stories" on public.blog_posts;
create policy "Staff can read all stories"
  on public.blog_posts for select
  to authenticated
  using (public.is_staff());

drop policy if exists "Staff can create stories" on public.blog_posts;
create policy "Staff can create stories"
  on public.blog_posts for insert
  to authenticated
  with check (public.is_staff());

drop policy if exists "Staff can edit stories" on public.blog_posts;
create policy "Staff can edit stories"
  on public.blog_posts for update
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists "Staff can delete stories" on public.blog_posts;
create policy "Staff can delete stories"
  on public.blog_posts for delete
  to authenticated
  using (public.is_staff());

drop policy if exists "SEO page overrides are public" on public.seo_pages;
create policy "SEO page overrides are public"
  on public.seo_pages for select
  to anon, authenticated
  using (true);

drop policy if exists "Admins can manage SEO page overrides" on public.seo_pages;
create policy "Admins can manage SEO page overrides"
  on public.seo_pages for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "SEO settings are public" on public.seo_settings;
create policy "SEO settings are public"
  on public.seo_settings for select
  to anon, authenticated
  using (true);

drop policy if exists "Admins can update SEO settings" on public.seo_settings;
create policy "Admins can update SEO settings"
  on public.seo_settings for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Redirects are public" on public.redirects;
create policy "Redirects are public"
  on public.redirects for select
  to anon, authenticated
  using (true);

drop policy if exists "Admins can manage redirects" on public.redirects;
create policy "Admins can manage redirects"
  on public.redirects for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Staff can read the publish log" on public.site_deploys;
create policy "Staff can read the publish log"
  on public.site_deploys for select
  to authenticated
  using (public.is_staff());

drop policy if exists "Staff can log their own publishes" on public.site_deploys;
create policy "Staff can log their own publishes"
  on public.site_deploys for insert
  to authenticated
  with check (public.is_staff() and requested_by = auth.uid());

drop policy if exists "Staff can read site status" on public.site_status;
create policy "Staff can read site status"
  on public.site_status for select
  to authenticated
  using (public.is_staff());

-- New tables aren't exposed to the Data API without explicit grants on current Supabase
-- projects (see auto_expose_new_tables in config.toml).
grant select on public.blog_posts, public.seo_pages, public.seo_settings, public.redirects
  to anon, authenticated;
grant insert, update, delete on public.blog_posts, public.seo_pages, public.redirects
  to authenticated;
grant update on public.seo_settings to authenticated;
grant select, insert on public.site_deploys to authenticated;
grant select on public.site_status to authenticated;

-- ---------------------------------------------------------------------------------------
-- Media bucket for story images (public read, staff write)
-- ---------------------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'blog-media',
  'blog-media',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Staff can upload blog media" on storage.objects;
create policy "Staff can upload blog media"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'blog-media' and public.is_staff());

drop policy if exists "Staff can browse blog media" on storage.objects;
create policy "Staff can browse blog media"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'blog-media' and public.is_staff());

drop policy if exists "Staff can replace blog media" on storage.objects;
create policy "Staff can replace blog media"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'blog-media' and public.is_staff());

drop policy if exists "Staff can delete blog media" on storage.objects;
create policy "Staff can delete blog media"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'blog-media' and public.is_staff());
