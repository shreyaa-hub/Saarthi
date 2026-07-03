-- Saarthi Coach — Therapy Authoring Studio
-- Initial schema: profiles, clinician-patient links, templates, assignments,
-- activity attempts, and cached AI insights.
--
-- Run this file's contents in the Supabase SQL editor for a fresh project
-- (Dashboard > SQL Editor > New query), or via the Supabase CLI:
--   supabase db push

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('clinician', 'patient')),
  full_name text not null,
  email text,
  avatar_color text default '#1e6f6a',
  headline text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Auto-create a profile row whenever a new auth user signs up.
-- Expects role/full_name to be passed in auth signUp() options.data.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, role, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'role', 'patient'),
    coalesce(new.raw_user_meta_data ->> 'full_name', 'New User'),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------------
-- clinician_patients — caseload links. A row is created by the clinician as
-- an invite (patient_id null, invite_code set); the patient "claims" it at
-- sign-up by supplying the invite code, which fills in patient_id.
-- ---------------------------------------------------------------------------
create table if not exists public.clinician_patients (
  id uuid primary key default gen_random_uuid(),
  clinician_id uuid not null references public.profiles (id) on delete cascade,
  patient_id uuid references public.profiles (id) on delete cascade,
  display_name text not null,
  invite_code text not null unique,
  status text not null default 'invited' check (status in ('invited', 'active', 'archived')),
  notes text,
  created_at timestamptz not null default now()
);

alter table public.clinician_patients enable row level security;

create index if not exists clinician_patients_clinician_idx on public.clinician_patients (clinician_id);
create index if not exists clinician_patients_patient_idx on public.clinician_patients (patient_id);

-- Security-definer helper so policies can check "is this clinician treating
-- this patient" without triggering RLS recursion.
create or replace function public.is_clinician_of(target_patient_id uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.clinician_patients cp
    where cp.patient_id = target_patient_id
      and cp.clinician_id = auth.uid()
      and cp.status = 'active'
  );
$$;

-- ---------------------------------------------------------------------------
-- templates — canvas-authored therapy activities owned by a clinician
-- ---------------------------------------------------------------------------
create table if not exists public.templates (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null default 'Untitled template',
  description text,
  domain text not null default 'General',
  medium text not null default 'interactive' check (medium in ('interactive', 'hybrid', 'print')),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  canvas jsonb not null default '{"width":900,"height":600,"background":"#ffffff","elements":[]}'::jsonb,
  thumbnail_color text default '#1e6f6a',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.templates enable row level security;

create index if not exists templates_owner_idx on public.templates (owner_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists templates_set_updated_at on public.templates;
create trigger templates_set_updated_at
  before update on public.templates
  for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------------
-- assignments — a template assigned to a specific patient, with a frozen
-- snapshot of the canvas so later template edits don't retroactively change
-- work already assigned.
-- ---------------------------------------------------------------------------
create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  template_id uuid references public.templates (id) on delete set null,
  clinician_id uuid not null references public.profiles (id) on delete cascade,
  patient_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  instructions text,
  due_date date,
  status text not null default 'assigned' check (status in ('assigned', 'in_progress', 'completed')),
  canvas_snapshot jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.assignments enable row level security;

create index if not exists assignments_clinician_idx on public.assignments (clinician_id);
create index if not exists assignments_patient_idx on public.assignments (patient_id);

-- ---------------------------------------------------------------------------
-- activity_attempts — a completed (or in-progress) run of an assignment
-- ---------------------------------------------------------------------------
create table if not exists public.activity_attempts (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments (id) on delete cascade,
  patient_id uuid not null references public.profiles (id) on delete cascade,
  responses jsonb not null default '{}'::jsonb,
  score numeric,
  correct_count int not null default 0,
  total_count int not null default 0,
  duration_seconds int,
  completed_at timestamptz not null default now()
);

alter table public.activity_attempts enable row level security;

create index if not exists activity_attempts_assignment_idx on public.activity_attempts (assignment_id);
create index if not exists activity_attempts_patient_idx on public.activity_attempts (patient_id);

-- ---------------------------------------------------------------------------
-- ai_insights — cached Claude-generated progress summaries for a patient,
-- visible only to the treating clinician.
-- ---------------------------------------------------------------------------
create table if not exists public.ai_insights (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles (id) on delete cascade,
  clinician_id uuid not null references public.profiles (id) on delete cascade,
  summary text not null,
  strengths jsonb not null default '[]'::jsonb,
  concerns jsonb not null default '[]'::jsonb,
  recommendations jsonb not null default '[]'::jsonb,
  attempts_considered int not null default 0,
  generated_at timestamptz not null default now()
);

alter table public.ai_insights enable row level security;

create index if not exists ai_insights_patient_idx on public.ai_insights (patient_id);

-- ---------------------------------------------------------------------------
-- RLS policies
--
-- Every policy is dropped-if-exists before being (re)created, so this whole
-- file is safe to paste and run again on a database that already has some
-- (or all) of these objects — e.g. if an earlier run partially failed.
-- Re-running is the standard way to repair a database stuck in a partial
-- state (which shows up as "permission denied for table X" errors in the
-- app, because RLS is enabled but the policy granting access never got
-- created).
-- ---------------------------------------------------------------------------

-- profiles
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (id = auth.uid());

drop policy if exists "profiles_select_linked" on public.profiles;
create policy "profiles_select_linked" on public.profiles
  for select using (
    public.is_clinician_of(id)
    or exists (
      select 1 from public.clinician_patients cp
      where cp.patient_id = auth.uid() and cp.clinician_id = profiles.id
    )
  );

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid());

-- clinician_patients
drop policy if exists "clinician_patients_clinician_all" on public.clinician_patients;
create policy "clinician_patients_clinician_all" on public.clinician_patients
  for all using (clinician_id = auth.uid()) with check (clinician_id = auth.uid());

drop policy if exists "clinician_patients_patient_select" on public.clinician_patients;
create policy "clinician_patients_patient_select" on public.clinician_patients
  for select using (patient_id = auth.uid());

-- Patients never UPDATE this table directly (see claim_invite() below) —
-- that avoids letting them tamper with clinician_id/notes/etc, and sidesteps
-- the awkward interaction between this table's "FOR ALL" clinician policy
-- and a patient-scoped "FOR UPDATE" policy on the same rows.

-- Security-definer RPC: a patient claims an invite by code at sign-up time.
-- Runs with elevated privileges so it can bypass the clinician-only RLS
-- policy above while still enforcing its own narrow business rule (only an
-- unclaimed invite, only linking to the calling user).
create or replace function public.claim_invite(p_invite_code text)
returns public.clinician_patients
language plpgsql
security definer set search_path = public
as $$
declare
  v_row public.clinician_patients;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  update public.clinician_patients
  set patient_id = auth.uid(), status = 'active'
  where invite_code = p_invite_code and patient_id is null
  returning * into v_row;

  if v_row.id is null then
    raise exception 'Invalid or already-used invite code';
  end if;

  return v_row;
end;
$$;

grant execute on function public.claim_invite(text) to authenticated;

-- templates (clinician-owned only)
drop policy if exists "templates_owner_all" on public.templates;
create policy "templates_owner_all" on public.templates
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- assignments
drop policy if exists "assignments_clinician_all" on public.assignments;
create policy "assignments_clinician_all" on public.assignments
  for all using (clinician_id = auth.uid()) with check (clinician_id = auth.uid());

drop policy if exists "assignments_patient_select" on public.assignments;
create policy "assignments_patient_select" on public.assignments
  for select using (patient_id = auth.uid());

drop policy if exists "assignments_patient_update_status" on public.assignments;
create policy "assignments_patient_update_status" on public.assignments
  for update using (patient_id = auth.uid()) with check (patient_id = auth.uid());

-- activity_attempts
drop policy if exists "activity_attempts_patient_all" on public.activity_attempts;
create policy "activity_attempts_patient_all" on public.activity_attempts
  for all using (patient_id = auth.uid()) with check (patient_id = auth.uid());

drop policy if exists "activity_attempts_clinician_select" on public.activity_attempts;
create policy "activity_attempts_clinician_select" on public.activity_attempts
  for select using (
    exists (
      select 1 from public.assignments a
      where a.id = activity_attempts.assignment_id
        and a.clinician_id = auth.uid()
    )
  );

-- ai_insights (clinician-only)
drop policy if exists "ai_insights_clinician_all" on public.ai_insights;
create policy "ai_insights_clinician_all" on public.ai_insights
  for all using (clinician_id = auth.uid()) with check (clinician_id = auth.uid());
