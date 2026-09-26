-- Create admins table for admin users
create table if not exists public.admins (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text,
  role text default 'admin' check (role in ('admin', 'super_admin')),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.admins enable row level security;

-- Policies for admins table
create policy "admins_select_own"
  on public.admins for select
  using (auth.uid() = id);

create policy "admins_insert_own"
  on public.admins for insert
  with check (auth.uid() = id);

create policy "admins_update_own"
  on public.admins for update
  using (auth.uid() = id);

-- Create function to auto-create admin profile on signup
create or replace function public.handle_new_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.admins (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', null)
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- Create trigger for new admin users
drop trigger if exists on_admin_user_created on auth.users;

create trigger on_admin_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_admin();
