-- Saarthi Coach — Blueprint Rules
--
-- Shared authoring standards every clinician follows when building activities
-- for patients. Deliberately platform-wide rather than per-clinician: a rule
-- that only its author could see would not be a standard, it would be a note.
--
-- Safe to re-run.

-- Fail with something readable rather than a bare foreign-key error if this
-- is run against a database that never got 0001.
do $$
begin
  if to_regclass('public.profiles') is null then
    raise exception 'public.profiles is missing — apply 0001_init.sql first.';
  end if;
end $$;

create table if not exists public.blueprint_rules (
  id uuid primary key default gen_random_uuid(),
  body text not null check (char_length(btrim(body)) between 1 and 500),
  created_by uuid references public.profiles (id) on delete set null,
  -- Marks the baseline rules seeded below, so the UI can label them as
  -- platform defaults rather than something a colleague added.
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

-- Every baseline rule is seeded in one statement and so shares a created_at
-- to the microsecond; without an explicit position their order would be
-- whatever the planner returns, scattering the groups they are written in.
alter table public.blueprint_rules
  add column if not exists sort_order integer not null default 0;

-- Two identical rules say nothing twice. Deduplicate before claiming
-- uniqueness, so this still applies cleanly to a database that already has
-- one (a clinician retyping a default, say).
delete from public.blueprint_rules a
using public.blueprint_rules b
where a.body = b.body and a.ctid > b.ctid;

create unique index if not exists blueprint_rules_body_key
  on public.blueprint_rules (body);

alter table public.blueprint_rules enable row level security;

create index if not exists blueprint_rules_created_idx
  on public.blueprint_rules (created_at);

-- No update grant, and deliberately no update policy: a rule is added or
-- retired, never edited in place. That also closes a two-step route around the
-- delete policy below — without UPDATE, nobody can flip is_default to false
-- and then delete a platform default.
grant select, insert, delete on public.blueprint_rules to authenticated;
revoke update on public.blueprint_rules from authenticated;

-- Readable by every signed-in user. Parents author printable worksheets too,
-- so standards they are expected to follow must not be invisible to them.
drop policy if exists "blueprint_rules_select_all" on public.blueprint_rules;
create policy "blueprint_rules_select_all" on public.blueprint_rules
  for select using (auth.uid() is not null);

-- Only clinicians write. created_by must be the caller, so a rule can always
-- be attributed to whoever actually added it.
drop policy if exists "blueprint_rules_clinician_insert" on public.blueprint_rules;
create policy "blueprint_rules_clinician_insert" on public.blueprint_rules
  for insert with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'clinician'
    )
  );

-- Any clinician may remove any rule: these are collective standards, not one
-- clinician's property, so ownership-scoped deletion would leave a rule
-- nobody could retire once its author left. The seeded baseline rules are
-- excluded — those are the platform's safety floor, not a colleague's
-- suggestion, and are not one clinician's to delete for everyone.
drop policy if exists "blueprint_rules_clinician_delete" on public.blueprint_rules;
create policy "blueprint_rules_clinician_delete" on public.blueprint_rules
  for delete using (
    is_default = false
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'clinician'
    )
  );

-- ---------------------------------------------------------------------------
-- Baseline rules.
--
-- These do double duty: they are the standards themselves, and they are the
-- worked examples a clinician reads before writing their own. So each one is
-- written the way a good rule reads — one specific, checkable instruction,
-- phrased as something you either did or did not do. "Keep activities
-- appropriate" would fail that test; "Do not depict violence, self-harm, or
-- frightening imagery" passes it.
--
-- Keyed on their own text, so re-running this migration tops up anything
-- missing and repairs the ordering of what is already there, without
-- duplicating anything or touching a rule a clinician wrote.
-- ---------------------------------------------------------------------------
insert into public.blueprint_rules (body, is_default, sort_order)
select v.body, true, v.pos
from (values
  -- Safety and appropriateness
  (10, 'Use of inappropriate language in text boxes is not allowed.'),
  (20, 'Use of explicit (18+) images is prohibited.'),
  (30, 'Activities must be age-appropriate for the patient they are assigned to.'),
  (40, 'Do not depict violence, self-harm, or frightening imagery in activity artwork.'),

  -- Privacy
  (50, 'Do not include a patient''s full name or other identifying details on a shared template.'),
  (60, 'Do not upload a photograph of a patient, or of any other identifiable person, without written consent from their guardian.'),
  (70, 'Keep diagnoses and clinical notes out of anything the patient will open themselves.'),

  -- Instructional clarity
  (80, 'State what the activity practises in its first text box, so anyone opening it knows the goal.'),
  (90, 'Write instructions to the patient in short sentences and plain words — "Say each word out loud", not clinical shorthand.'),
  (100, 'Target one skill per activity. If it practises two, split it into two.'),

  -- Accessibility
  (110, 'Keep body text at 16px or larger, and do not place text over a busy background image.'),
  (120, 'Do not use colour alone to carry meaning — pair it with a label, a shape, or a position.'),
  (130, 'Give every image that carries meaning a caption or a text alternative.'),

  -- Language
  (140, 'Have translated text checked by a fluent speaker before assigning it to a patient.'),
  (150, 'Use names, objects, and examples a child in the patient''s own setting would recognise.')
) as v(pos, body)
-- Gaps of ten so a rule can be slotted between two others later without
-- renumbering the whole list.
on conflict (body) do update
  set is_default = true,
      sort_order = excluded.sort_order;

-- ---------------------------------------------------------------------------
-- PostgREST answers the app's queries from a cached copy of the schema, and a
-- brand-new table stays invisible to it until that cache is refreshed —
-- surfacing as "Could not find the table 'public.blueprint_rules' in the
-- schema cache" even though the table is right there. Ask for the reload
-- rather than waiting for one.
-- ---------------------------------------------------------------------------
notify pgrst, 'reload schema';

-- Runs last so the SQL editor shows it: a successful apply is visible rather
-- than assumed. Expect 15 baseline rules.
select
  count(*) filter (where is_default) as baseline_rules,
  count(*) filter (where not is_default) as clinician_rules,
  count(*) as total
from public.blueprint_rules;
