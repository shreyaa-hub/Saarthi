-- Saarthi Coach — Blueprint Rules
--
-- Shared authoring standards every clinician follows when building activities
-- for patients. Deliberately platform-wide rather than per-clinician: a rule
-- that only its author could see would not be a standard, it would be a note.
--
-- Safe to re-run.

create table if not exists public.blueprint_rules (
  id uuid primary key default gen_random_uuid(),
  body text not null check (char_length(btrim(body)) between 1 and 500),
  created_by uuid references public.profiles (id) on delete set null,
  -- Marks the baseline rules seeded below, so the UI can label them as
  -- platform defaults rather than something a colleague added.
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

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
-- Baseline rules. Seeded once and keyed on their own text, so re-running this
-- migration does not duplicate them.
-- ---------------------------------------------------------------------------
insert into public.blueprint_rules (body, is_default)
select v.body, true
from (values
  ('Use of inappropriate language in text boxes is not allowed.'),
  ('Use of explicit (18+) images is prohibited.'),
  ('Activities must be age-appropriate for the patient they are assigned to.'),
  ('Do not include a patient''s full name or other identifying details on a shared template.')
) as v(body)
where not exists (
  select 1 from public.blueprint_rules existing where existing.body = v.body
);
