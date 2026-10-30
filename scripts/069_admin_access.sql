-- ═══════════════════════════════════════════════════════════════════════════
-- 069 — Admin access you can trust
--
-- Who is an admin is decided by public.user_roles (role 'admin'), which only
-- the server can write. The admin panel checks it (plus the ADMIN_EMAILS env
-- variable as a lock-out-proof fallback).
--
-- Why not the `admins` table? The admin panel's migration 001 added EVERY new
-- signup to `admins` automatically (role 'admin'), and its policies let any
-- signed-in user insert themselves or change their own role. The admin panel
-- and the main app share one login system, so every learner has a row there —
-- it can't tell admins apart from learners.
--
-- Effect on the main QuillGlow app: none. The main app never reads `admins`;
-- learner signup still creates the learner's profile and subscription through
-- its own triggers, which are untouched. Removing the admins trigger also
-- removes an extra insert from every learner signup.
--
-- Safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Stop adding every new signup to `admins`.
drop trigger if exists on_admin_user_created on auth.users;

-- 2. Lock the `admins` table (it now only holds admin-panel profile details,
--    e.g. full_name shown in admin Settings).
do $$
begin
  if to_regclass('public.admins') is not null then
    execute 'drop policy if exists "admins_insert_own" on public.admins';
    execute 'drop policy if exists "admins_update_own" on public.admins';
    execute 'create policy "admins_update_own" on public.admins for update to authenticated using (auth.uid() = id) with check (auth.uid() = id)';
    -- Signed-in users may change only their display name — never `role` or `email`.
    execute 'revoke insert, update, delete on public.admins from anon, authenticated';
    execute 'grant update (full_name, updated_at) on public.admins to authenticated';
  end if;
end $$;

-- 3. Grant / revoke admin access by email. Run these from the Supabase SQL
--    editor (or server code with the service key) — never from the browser.
create or replace function public.grant_admin_by_email(p_email text)
returns text
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_id uuid;
begin
  select id into v_id from auth.users where lower(email) = lower(trim(p_email)) limit 1;
  if v_id is null then
    return 'No account with email ' || p_email || ' — sign up first (main app or /admin/signup), then run this again.';
  end if;
  insert into public.user_roles (user_id, role) values (v_id, 'admin') on conflict do nothing;
  if to_regclass('public.admins') is not null then
    insert into public.admins (id, email) values (v_id, lower(trim(p_email))) on conflict (id) do nothing;
  end if;
  return 'Admin access granted to ' || p_email;
end;
$$;

create or replace function public.revoke_admin_by_email(p_email text)
returns text
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_id uuid;
begin
  select id into v_id from auth.users where lower(email) = lower(trim(p_email)) limit 1;
  if v_id is null then
    return 'No account with email ' || p_email;
  end if;
  delete from public.user_roles where user_id = v_id and role = 'admin';
  return 'Admin access removed from ' || p_email;
end;
$$;

-- Server-side check used by the admin panel (service role only).
create or replace function public.is_platform_admin(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = p_user_id and role = 'admin')
$$;

revoke execute on function public.grant_admin_by_email(text)  from public, anon, authenticated;
revoke execute on function public.revoke_admin_by_email(text) from public, anon, authenticated;
revoke execute on function public.is_platform_admin(uuid)     from public, anon, authenticated;
grant  execute on function public.grant_admin_by_email(text)  to service_role;
grant  execute on function public.revoke_admin_by_email(text) to service_role;
grant  execute on function public.is_platform_admin(uuid)     to service_role;

-- ── Give yourself access ────────────────────────────────────────────────────
-- Replace with your admin email(s) and run (one line per admin):
--
--   select public.grant_admin_by_email('you@yourdomain.com');
--
-- To remove someone later:
--
--   select public.revoke_admin_by_email('former-admin@yourdomain.com');
