-- CareerOS Supabase Migration
-- Run this in: Supabase Dashboard → SQL Editor → New Query

-- ── USER PROFILES ─────────────────────────────────────────────────────────────
create table if not exists user_profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    email text,
    name text,
    title text,
    years_exp int,
    level text,
    target_role text,
    skills text,
    location text,
    is_pro boolean default false,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- ── INTERVIEW NOTES ───────────────────────────────────────────────────────────
create table if not exists interview_notes (
    id uuid primary key default gen_random_uuid(),
    user_id uuid unique references auth.users(id) on delete cascade,
    notes text,
    updated_at timestamptz default now()
);

-- ── COMPANY ASSESSMENTS ───────────────────────────────────────────────────────
create table if not exists company_assessments (
    id uuid primary key default gen_random_uuid(),
    user_id uuid unique references auth.users(id) on delete cascade,
    data jsonb,
    updated_at timestamptz default now()
);

-- ── CONTRACT ANALYSES ─────────────────────────────────────────────────────────
create table if not exists contract_analyses (
    id uuid primary key default gen_random_uuid(),
    user_id uuid unique references auth.users(id) on delete cascade,
    data jsonb,
    updated_at timestamptz default now()
);

-- ── DOCUMENTS (SCHUFA + certs + refs + bank accounts) ────────────────────────
create table if not exists documents (
    id uuid primary key default gen_random_uuid(),
    user_id uuid unique references auth.users(id) on delete cascade,
    schufa_score int,
    schufa_date text,
    schufa_notes text,
    certifications jsonb default '[]',
    references jsonb default '[]',
    bank_accounts jsonb default '[]',
    updated_at timestamptz default now()
);

-- ── ROW LEVEL SECURITY ────────────────────────────────────────────────────────
alter table user_profiles enable row level security;
alter table interview_notes enable row level security;
alter table company_assessments enable row level security;
alter table contract_analyses enable row level security;
alter table documents enable row level security;

-- Users see only their own rows
create policy "own profile" on user_profiles for all using (auth.uid() = id);
create policy "own interview_notes" on interview_notes for all using (auth.uid() = user_id);
create policy "own company_assessments" on company_assessments for all using (auth.uid() = user_id);
create policy "own contract_analyses" on contract_analyses for all using (auth.uid() = user_id);
create policy "own documents" on documents for all using (auth.uid() = user_id);

-- Admin bypass: myrthetjaarda@gmail.com can read all rows
create policy "admin read profiles" on user_profiles for select using (auth.email() = 'myrthetjaarda@gmail.com');
create policy "admin read notes" on interview_notes for select using (auth.email() = 'myrthetjaarda@gmail.com');
create policy "admin read assessments" on company_assessments for select using (auth.email() = 'myrthetjaarda@gmail.com');
create policy "admin read contracts" on contract_analyses for select using (auth.email() = 'myrthetjaarda@gmail.com');
create policy "admin read documents" on documents for select using (auth.email() = 'myrthetjaarda@gmail.com');

-- Admin can also update is_pro on user_profiles (for manual Pro toggling)
create policy "admin update profiles" on user_profiles for update using (auth.email() = 'myrthetjaarda@gmail.com');

-- ── OPPORTUNITIES TABLE (if not already created) ──────────────────────────────
create table if not exists opportunities (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade,
    company text not null,
    role text not null,
    status text default 'Saved',
    notes text,
    created_at timestamptz default now()
);

alter table opportunities enable row level security;
create policy "own opportunities" on opportunities for all using (auth.uid() = user_id);
create policy "admin read opportunities" on opportunities for select using (auth.email() = 'myrthetjaarda@gmail.com');
