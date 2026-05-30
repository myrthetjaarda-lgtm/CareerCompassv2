-- CareerCompass: initial schema
-- Run via: npx supabase db push

-- ── Profiles (one per user, admin-visible) ──────────────────────
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text,
  name text,
  is_pro boolean default false,
  is_admin boolean default false,
  created_at timestamptz default now()
);

-- ── User data (entire AppData as JSONB) ─────────────────────────
create table if not exists public.user_data (
  user_id uuid references auth.users(id) on delete cascade primary key,
  data jsonb not null default '{}',
  updated_at timestamptz default now()
);

-- ── Row-level security ───────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.user_data enable row level security;

-- Users can only read/write their own rows
create policy "own profile" on public.profiles
  for all using (auth.uid() = id);

create policy "own data" on public.user_data
  for all using (auth.uid() = user_id);

-- ── Auto-create profile on sign up ──────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, is_admin, is_pro)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email = 'myrthetjaarda@gmail.com',
    new.email = 'myrthetjaarda@gmail.com'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
