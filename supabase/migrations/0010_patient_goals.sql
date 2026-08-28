-- Therapy goals: what this patient is working towards, and whether they are
-- getting there.
--
-- The analytics up to now answered "how accurate has this patient been",
-- which is a trend with no criterion attached. Clinical practice is
-- goal-driven — "80% on Articulation across the last five activities" — and
-- without somewhere to record the target, every accuracy figure in the app
-- was a number nobody could pass or fail.

create table if not exists public.patient_goals (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles (id) on delete cascade,
  -- Who set it. Kept even after the goal is met, so a discharge summary can
  -- say who was working on what.
  clinician_id uuid not null references public.profiles (id) on delete cascade,

  title text not null check (length(btrim(title)) between 1 and 200),

  -- Which slice of the patient's work counts towards it. Null means all of
  -- it. Deliberately free text matching templates.domain rather than an enum:
  -- domain is already free text there, and an enum here would drift from it.
  domain text,

  -- The bar, as a percentage of items correct.
  target_accuracy int not null default 80 check (target_accuracy between 1 and 100),

  -- How many recent attempts the bar is measured over. A single lucky
  -- activity should not retire a goal, which is the whole reason this is not
  -- just "latest score".
  window_attempts int not null default 5 check (window_attempts between 1 and 50),

  status text not null default 'active' check (status in ('active', 'achieved', 'archived')),

  created_at timestamptz not null default now(),
  achieved_at timestamptz,

  -- A goal marked achieved without a date, or dated without being achieved,
  -- would make "when did they meet it" unanswerable.
  constraint patient_goals_achieved_at_matches_status
    check ((status = 'achieved') = (achieved_at is not null))
);

create index if not exists patient_goals_patient_idx
  on public.patient_goals (patient_id, status);

alter table public.patient_goals enable row level security;

-- The clinician treating this patient owns the goal outright. is_clinician_of
-- is the same helper every other clinician policy uses, so "who treats this
-- patient" has one definition.
drop policy if exists "patient_goals_clinician_all" on public.patient_goals;
create policy "patient_goals_clinician_all" on public.patient_goals
  for all using (public.is_clinician_of(patient_id))
  with check (public.is_clinician_of(patient_id) and clinician_id = auth.uid());

-- The patient and their guardian read them and cannot change them. A goal the
-- subject can edit is not a goal, the same reasoning as 0008.
drop policy if exists "patient_goals_patient_select" on public.patient_goals;
create policy "patient_goals_patient_select" on public.patient_goals
  for select using (patient_id = auth.uid());

drop policy if exists "patient_goals_guardian_select" on public.patient_goals;
create policy "patient_goals_guardian_select" on public.patient_goals
  for select using (public.is_guardian_of(patient_id));

-- Only the clinician's policy grants writes, but the column privileges are
-- role-wide, so spell out that nobody may delete or update through some other
-- policy added later. Reads stay open to the three policies above.
revoke all on public.patient_goals from anon;
grant select, insert, update, delete on public.patient_goals to authenticated;
