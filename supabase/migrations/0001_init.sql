-- Verbal Coach — Therapy Authoring Studio
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

-- Added after the initial table create — "alter ... add column if not
-- exists" so re-running this file against an already-live project (not
-- just a fresh one) still picks it up.
alter table public.templates add column if not exists deleted_at timestamptz;

-- is_public is distinct from status='published': "published" means the
-- clinician's own patients can be assigned this template; is_public means
-- the clinician has chosen to share it in the cross-role Global Library,
-- visible to anyone (including logged-out visitors browsing the public
-- Template/Worksheet Library pages).
alter table public.templates add column if not exists is_public boolean not null default false;

alter table public.templates enable row level security;

create index if not exists templates_owner_idx on public.templates (owner_id);
create index if not exists templates_public_idx on public.templates (is_public) where is_public = true;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
-- Pinned like every other function here. Not security definer, so the
-- exposure is small, but a trigger resolving now() through a caller-supplied
-- search_path is resolving a name it did not have to.
set search_path = public, pg_temp
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

alter table public.activity_attempts add column if not exists clinician_note text;

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
-- notifications — the Alert Hub. A recipient-owned inbox row created by
-- create_notification() below, never inserted directly (see that function's
-- comment for why).
-- ---------------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);

-- Generic, polymorphic reference into whatever entity a notification is
-- about — meaning depends on type, matching the same soft, type-driven
-- contract type/link already have on this table. No FK: the referenced
-- table differs per type, and this table already tolerates soft/stale
-- references (link can already point at a deleted assignment today).
--
-- For type = 'new_message' this stores messages.conversation_id, NOT
-- clinician_patients.id. conversations.clinician_patient_id is nullable
-- by design (deliberately left room above for clinician-clinician or
-- group conversations with no clinician_patients row at all), so it can't
-- reliably identify every conversation; conversation_id always can, and
-- stays correct even if a future schema change ever allows more than one
-- conversation per clinician_patients relationship (today's
-- conversations_clinician_patient_uidx assumes exactly one).
alter table public.notifications add column if not exists reference_id uuid;

-- Backs notify_new_message()'s upsert below. Unique, not just a plain
-- index: guarantees at most one unread notification per (user, type,
-- reference) at the database level, which is what makes that upsert
-- race-free (a single INSERT ... ON CONFLICT ... DO UPDATE) rather than a
-- separate check-then-branch that two near-simultaneous messages could
-- both slip through. Partial on read_at is null: once a notification is
-- read, a later message on the same reference_id starts a fresh row
-- instead of merging into history the recipient already saw. Rows with
-- reference_id null (new_assignment, attempt_completed — neither sets it)
-- are unaffected: Postgres never treats two nulls as conflicting under a
-- unique constraint.
create unique index if not exists notifications_dedup_idx
  on public.notifications (user_id, type, reference_id)
  where read_at is null;

-- ---------------------------------------------------------------------------
-- assets — standalone images a clinician publishes to the Global Library's
-- Asset Library (distinct from images uploaded straight into a canvas via
-- the "template-assets" storage bucket — those stay private to the
-- template they're used in unless explicitly published here).
-- ---------------------------------------------------------------------------
create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  url text not null,
  alt text not null default '',
  created_at timestamptz not null default now()
);

alter table public.assets enable row level security;

create index if not exists assets_owner_idx on public.assets (owner_id);

-- ---------------------------------------------------------------------------
-- conversations — Messenger. Deliberately decoupled from clinician_patients
-- (nullable, unique FK) rather than keyed directly off it: a conversation
-- isn't structurally required to be a clinician-patient pair, which leaves
-- room for clinician-clinician or group conversations later without
-- redesigning this table. clinician_patient_id stays the fast, unique path
-- for today's only real case (get-or-create via start_conversation() below).
-- last_message_at / last_message_preview are denormalized from messages
-- (kept correct by the messages_touch_conversation trigger below) purely so
-- a future inbox view can sort/preview without aggregating messages on
-- every render.
-- ---------------------------------------------------------------------------
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  clinician_patient_id uuid references public.clinician_patients (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null,
  last_message_at timestamptz,
  last_message_preview text,
  created_at timestamptz not null default now()
);

alter table public.conversations enable row level security;

create unique index if not exists conversations_clinician_patient_uidx
  on public.conversations (clinician_patient_id)
  where clinician_patient_id is not null;
create index if not exists conversations_last_message_idx
  on public.conversations (last_message_at desc);

-- ---------------------------------------------------------------------------
-- conversation_participants — who's in a conversation, plus each
-- participant's own state (read position, archive/pin/mute). Deliberately
-- role-agnostic — no is_clinician-style flag — so it works identically for
-- clinician-patient, clinician-clinician, or group conversations. This is
-- the table that makes conversations N-ary instead of hard-coding "exactly
-- one clinician + one patient."
-- ---------------------------------------------------------------------------
create table if not exists public.conversation_participants (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  last_read_at timestamptz,
  archived_at timestamptz,
  pinned_at timestamptz,
  muted_until timestamptz,
  unique (conversation_id, user_id)
);

alter table public.conversation_participants enable row level security;

create index if not exists conversation_participants_user_idx
  on public.conversation_participants (user_id);

-- ---------------------------------------------------------------------------
-- messages. message_type is presentation-only — it tells the client HOW to
-- render a row (plain text bubble, image, file chip, system/audit line). It
-- must never carry business logic; event-specific behaviour belongs in
-- metadata (e.g. {"event":"assignment_submitted","assignment_id":"..."}),
-- so new event types extend metadata's shape, not this column's constraint.
-- body is nullable: required content for TEXT, an optional caption for
-- IMAGE/FILE (message_attachments lands in a later phase), and the
-- human-readable line for SYSTEM. sender_id is nullable and ON DELETE SET
-- NULL (not cascade, unlike this file's usual convention) so a deleted
-- account doesn't erase the other participant's message history.
-- ---------------------------------------------------------------------------
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid references public.profiles (id) on delete set null,
  message_type text not null default 'TEXT'
    check (message_type in ('TEXT', 'IMAGE', 'FILE', 'SYSTEM')),
  body text,
  metadata jsonb,
  edited_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.messages enable row level security;

-- The one index every thread render depends on: "messages for conversation
-- X, ordered/paginated by time."
create index if not exists messages_conversation_created_idx
  on public.messages (conversation_id, created_at);

-- Keeps conversations.last_message_at / last_message_preview correct for
-- every message type uniformly (including SYSTEM), in one place, so
-- Phase 1's sendMessage() and this file's create_system_message() RPC don't
-- each need to remember to update it separately.
create or replace function public.touch_conversation_on_message()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.conversations
  set last_message_at = new.created_at,
      last_message_preview = left(coalesce(new.body, ''), 140)
  where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists messages_touch_conversation on public.messages;
create trigger messages_touch_conversation
  after insert on public.messages
  for each row execute procedure public.touch_conversation_on_message();

-- ---------------------------------------------------------------------------
-- Base table grants
--
-- RLS policies decide WHICH ROWS a role can see; Postgres separately
-- requires a GRANT before a role can touch a table's ROWS AT ALL, at a
-- level below RLS. Supabase's dashboard-created tables get this
-- automatically, but tables created via raw SQL (like this migration) may
-- not, depending on the project's default privileges — and when that grant
-- is missing, every query fails with "permission denied for table X"
-- regardless of how correct the RLS policies are. This block is idempotent
-- (safe to re-run) and makes the migration self-contained either way.
-- ---------------------------------------------------------------------------
grant usage on schema public to authenticated;
grant select, insert, update, delete on
  public.profiles,
  public.clinician_patients,
  public.templates,
  public.assignments,
  public.activity_attempts,
  public.ai_insights,
  public.notifications,
  public.assets,
  public.conversations,
  public.conversation_participants,
  public.messages
to authenticated;

-- The Global Library (Template/Worksheet/Asset Library) pages are public
-- marketing pages, browsable while logged out — anon needs read access too.
-- RLS below still restricts this to is_public = true rows only.
grant usage on schema public to anon;
grant select on public.templates, public.assets to anon;

-- ---------------------------------------------------------------------------
-- RLS policies
--
-- Every policy is dropped-if-exists before being (re)created, so this whole
-- file is safe to paste and run again on a database that already has some
-- (or all) of these objects — e.g. if an earlier run partially failed.
-- Re-running is the standard way to repair a database stuck in a partial
-- state.
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

-- Global Library — anyone (including logged-out visitors) can read a
-- template its owner has explicitly published to the library. Separate
-- from templates_owner_all so an owner doesn't need is_public to manage
-- their own rows, and a stranger only ever sees the public subset.
drop policy if exists "templates_public_select" on public.templates;
create policy "templates_public_select" on public.templates
  for select using (is_public = true and deleted_at is null);

-- assets — Global Library's Asset Library. The whole table is
-- library-published content by construction (see comment on the table
-- above), so read access is unconditionally public; writes are owner-only.
drop policy if exists "assets_public_select" on public.assets;
create policy "assets_public_select" on public.assets
  for select using (true);

drop policy if exists "assets_owner_write" on public.assets;
create policy "assets_owner_write" on public.assets
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

-- Lets the treating clinician attach a note to an attempt (e.g. "great
-- articulation today, revisit blends next session"). The app only ever
-- sends clinician_note in this update, but RLS here is row-scoped, not
-- column-scoped — same trust boundary as every other clinician policy
-- in this file.
drop policy if exists "activity_attempts_clinician_update_note" on public.activity_attempts;
create policy "activity_attempts_clinician_update_note" on public.activity_attempts
  for update using (
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

-- notifications — recipient-owned inbox. No INSERT policy here on purpose:
-- a clinician notifying a patient (or vice versa) is writing a row owned by
-- someone ELSE, which a simple "user_id = auth.uid()" check can't allow.
-- create_notification() below is the only sanctioned way to insert a row,
-- and it verifies the caller and recipient are actually linked before doing
-- so — same security-definer pattern as claim_invite() above.
drop policy if exists "notifications_owner_select" on public.notifications;
create policy "notifications_owner_select" on public.notifications
  for select using (user_id = auth.uid());

drop policy if exists "notifications_owner_update" on public.notifications;
create policy "notifications_owner_update" on public.notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.create_notification(
  p_recipient_id uuid,
  p_type text,
  p_title text,
  p_body text,
  p_link text
)
returns public.notifications
language plpgsql
security definer set search_path = public
as $$
declare
  v_row public.notifications;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if auth.uid() <> p_recipient_id and not exists (
    select 1 from public.clinician_patients cp
    where cp.status = 'active'
      and ((cp.clinician_id = auth.uid() and cp.patient_id = p_recipient_id)
        or (cp.patient_id = auth.uid() and cp.clinician_id = p_recipient_id))
  ) then
    raise exception 'Not authorized to notify this user';
  end if;

  insert into public.notifications (user_id, type, title, body, link)
  values (p_recipient_id, p_type, p_title, p_body, p_link)
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.create_notification(uuid, text, text, text, text) to authenticated;

-- Dedicated rather than a generic upsert_notification(): the authorization
-- check below is specific to the clinician_patients relationship model,
-- same as create_notification() above, so a generic name would overstate
-- what this actually covers. If a second dedup'd notification type with
-- matching authorization needs ever shows up, that's the point to factor
-- out a shared helper — not before, for a caller that doesn't exist yet.
--
-- Exists at all because notifications' RLS (see notifications_owner_select
-- / _update above) is owner-only for both select and update, so a
-- sender's own session can never read or coalesce a recipient's existing
-- notification row without a security-definer function — same reasoning
-- as create_notification() and create_system_message().
create or replace function public.notify_new_message(
  p_recipient_id uuid,
  p_reference_id uuid,
  p_link text,
  p_title text,
  p_body text
)
returns public.notifications
language plpgsql
security definer set search_path = public
as $$
declare
  v_row public.notifications;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if auth.uid() <> p_recipient_id and not exists (
    select 1 from public.clinician_patients cp
    where cp.status = 'active'
      and ((cp.clinician_id = auth.uid() and cp.patient_id = p_recipient_id)
        or (cp.patient_id = auth.uid() and cp.clinician_id = p_recipient_id))
  ) then
    raise exception 'Not authorized to notify this user';
  end if;

  insert into public.notifications (user_id, type, reference_id, link, title, body)
  values (p_recipient_id, 'new_message', p_reference_id, p_link, p_title, p_body)
  on conflict (user_id, type, reference_id) where read_at is null
  do update set title = excluded.title, body = excluded.body, link = excluded.link, created_at = now()
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.notify_new_message(uuid, uuid, text, text, text) to authenticated;

-- conversations / conversation_participants / messages (Messenger)
--
-- Security model: a user may see a conversation, its participant list, and
-- its messages only if a conversation_participants row exists for them.
--
-- conversation_participants' own SELECT policy needs to answer "is the
-- caller a participant of this row's conversation", which means querying
-- conversation_participants from within its own policy. A raw self-join
-- subquery there makes Postgres re-apply the same policy to the inner
-- query and it reports "infinite recursion detected in policy" (confirmed
-- locally) rather than actually looping forever. The fix is the standard
-- one: push the self-lookup into a small security-definer function. A
-- security-definer function runs as its owner, and a table's owner
-- bypasses RLS on that table (this project never sets FORCE ROW LEVEL
-- SECURITY), so the query inside is_conversation_participant() below reads
-- conversation_participants directly with no policy re-entry — the
-- recursion never starts.
--
-- Nothing here lets a client INSERT into conversations or
-- conversation_participants directly — both are only ever written by the
-- security-definer RPCs below, same pattern as claim_invite()/
-- create_notification() above: any authenticated user may call them, but
-- the RPC's own checks (an active clinician_patients link; existing
-- participant membership) are what enforce the real boundary.
create or replace function public.is_conversation_participant(p_conversation_id uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.conversation_participants
    where conversation_id = p_conversation_id
      and user_id = auth.uid()
  );
$$;

grant execute on function public.is_conversation_participant(uuid) to authenticated;

drop policy if exists "conversations_participant_select" on public.conversations;
create policy "conversations_participant_select" on public.conversations
  for select using (public.is_conversation_participant(conversations.id));

drop policy if exists "conversation_participants_self_select" on public.conversation_participants;
create policy "conversation_participants_self_select" on public.conversation_participants
  for select using (
    user_id = auth.uid()
    or public.is_conversation_participant(conversation_participants.conversation_id)
  );

drop policy if exists "conversation_participants_self_update" on public.conversation_participants;
create policy "conversation_participants_self_update" on public.conversation_participants
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "messages_participant_select" on public.messages;
create policy "messages_participant_select" on public.messages
  for select using (
    exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = messages.conversation_id
        and cp.user_id = auth.uid()
    )
  );

-- message_type <> 'SYSTEM' here means a raw client insert can never create
-- a SYSTEM row, full stop — the only path to one is create_system_message()
-- below. sender_id = auth.uid() blocks impersonating another sender; the
-- exists() clause blocks posting into a conversation the caller isn't in.
drop policy if exists "messages_sender_insert" on public.messages;
create policy "messages_sender_insert" on public.messages
  for insert with check (
    sender_id = auth.uid()
    and message_type <> 'SYSTEM'
    and exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = messages.conversation_id
        and cp.user_id = auth.uid()
    )
  );

-- Covers both "edit" (body + edited_at) and "soft delete" (deleted_at) —
-- both are UPDATEs from the client's perspective. SYSTEM messages are
-- excluded here too: no one "owns" an audit-trail row to edit or delete.
-- No DELETE policy at all — this table follows the same soft-delete-only
-- convention as templates.deleted_at elsewhere in this file.
drop policy if exists "messages_sender_update" on public.messages;
create policy "messages_sender_update" on public.messages
  for update using (sender_id = auth.uid() and message_type <> 'SYSTEM')
  with check (sender_id = auth.uid() and message_type <> 'SYSTEM');

-- Get-or-create a conversation for a clinician_patients relationship.
-- Race-safe: two near-simultaneous calls can both reach the insert: the
-- unique partial index on clinician_patient_id makes the loser's insert a
-- no-op (ON CONFLICT DO NOTHING) instead of an error, and both callers then
-- converge on the same row via the select that follows.
create or replace function public.start_conversation(p_clinician_patient_id uuid)
returns public.conversations
language plpgsql
security definer set search_path = public
as $$
declare
  v_clinician_id uuid;
  v_patient_id uuid;
  v_conversation public.conversations;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select clinician_id, patient_id
    into v_clinician_id, v_patient_id
    from public.clinician_patients
   where id = p_clinician_patient_id
     and status = 'active';

  if v_clinician_id is null or v_patient_id is null then
    raise exception 'No active, claimed clinician-patient relationship for that id';
  end if;

  if auth.uid() <> v_clinician_id and auth.uid() <> v_patient_id then
    raise exception 'Not authorized to start this conversation';
  end if;

  insert into public.conversations (clinician_patient_id, created_by)
  values (p_clinician_patient_id, auth.uid())
  on conflict (clinician_patient_id) where clinician_patient_id is not null
  do nothing;

  select * into v_conversation
    from public.conversations
   where clinician_patient_id = p_clinician_patient_id;

  insert into public.conversation_participants (conversation_id, user_id)
  values (v_conversation.id, v_clinician_id), (v_conversation.id, v_patient_id)
  on conflict (conversation_id, user_id) do nothing;

  return v_conversation;
end;
$$;

grant execute on function public.start_conversation(uuid) to authenticated;

-- The only sanctioned way to create a SYSTEM message (see the RLS policy
-- above, which blocks direct client inserts of this type entirely).
-- Requires the caller to already be a participant of the target
-- conversation — same defense-in-depth stance as create_notification()
-- rather than blind trust, even though nothing in this phase's scope
-- exposes this RPC to end users yet.
create or replace function public.create_system_message(
  p_conversation_id uuid,
  p_body text,
  p_metadata jsonb
)
returns public.messages
language plpgsql
security definer set search_path = public
as $$
declare
  v_message public.messages;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not exists (
    select 1 from public.conversation_participants
    where conversation_id = p_conversation_id
      and user_id = auth.uid()
  ) then
    raise exception 'Not a participant of this conversation';
  end if;

  insert into public.messages (conversation_id, sender_id, message_type, body, metadata)
  values (p_conversation_id, null, 'SYSTEM', p_body, p_metadata)
  returning * into v_message;

  return v_message;
end;
$$;

grant execute on function public.create_system_message(uuid, text, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Realtime (Step 5, Phase 0) — makes messages/notifications changes stream
-- to subscribed clients at all. This is separate from, and in addition to,
-- RLS: RLS (messages_participant_select, notifications_owner_select above)
-- governs which rows a given client is ALLOWED to receive once Realtime is
-- broadcasting; publication membership governs whether a table broadcasts
-- to Realtime in the first place. Every Supabase project ships a
-- `supabase_realtime` publication by default (empty of tables), so this
-- only adds membership, never creates the publication itself.
--
-- `alter publication ... add table` is not naturally idempotent (errors on
-- a table already in the publication), so each addition is guarded by a
-- pg_publication_tables existence check, matching this file's "if not
-- exists" convention elsewhere.
--
-- conversation_participants is deliberately NOT added here — it's scoped
-- to a later phase of Step 5 (live read-state propagation), with its own
-- verification gate, not part of this initial infrastructure step.
--
-- SAFETY NOTE FOR ANY FUTURE TABLE ADDED HERE: Realtime does not enforce
-- RLS for DELETE statements (Postgres has no way to check authorization
-- against a row that no longer exists) — a table relying on RLS-scoped
-- Realtime delivery must stay soft-delete-only (UPDATE, never DELETE) for
-- that delivery scoping to hold. messages and notifications both already
-- follow this convention (messages.deleted_at, no notifications delete
-- path) — do not add real DELETE support to either without revisiting this.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- storage — "template-assets" bucket for images uploaded into the canvas
-- editor. Public bucket (activities render images to patients who aren't
-- the uploading clinician), but writes are restricted to the uploader's own
-- folder: objects are stored at "<user_id>/<file>", and the RLS policies
-- below key off that first path segment via storage.foldername(name).
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('template-assets', 'template-assets', true)
on conflict (id) do nothing;

drop policy if exists "template_assets_public_read" on storage.objects;
create policy "template_assets_public_read" on storage.objects
  for select using (bucket_id = 'template-assets');

drop policy if exists "template_assets_owner_insert" on storage.objects;
create policy "template_assets_owner_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'template-assets' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "template_assets_owner_update" on storage.objects;
create policy "template_assets_owner_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'template-assets' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "template_assets_owner_delete" on storage.objects;
create policy "template_assets_owner_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'template-assets' and (storage.foldername(name))[1] = auth.uid()::text);
