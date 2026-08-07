-- Saarthi Coach — parent-assigned activities
--
-- Lets a parent push a worksheet they own (or one published to the library)
-- into their own child's mission list, and closes a pre-existing hole in the
-- assignment policy while doing it.
--
-- The hole: assignments_clinician_all authorised an INSERT purely on
-- `clinician_id = auth.uid()`. It never checked that the assigner had any
-- relationship to `patient_id`, so any authenticated clinician could create an
-- assignment against ANY patient id, for a patient who was not on their
-- caseload. The UI never offered that, which is why it went unnoticed —
-- but RLS is the thing standing between a crafted request and someone else's
-- patient, and it was not enforcing the rule. Extending that policy to parents
-- unchanged would have turned a latent gap into a live one.
--
-- Safe to re-run.

-- ---------------------------------------------------------------------------
-- assignments.assigned_by — who created this assignment.
--
-- Distinct from clinician_id, which stays meaning "the clinician responsible
-- for this patient's care" and is now nullable, because a parent-assigned
-- worksheet may have no clinician involved at all.
-- ---------------------------------------------------------------------------
alter table public.assignments
  add column if not exists assigned_by uuid references public.profiles (id) on delete cascade;

-- Every pre-existing assignment was created by its clinician.
update public.assignments set assigned_by = clinician_id where assigned_by is null;

alter table public.assignments alter column assigned_by set not null;
alter table public.assignments alter column clinician_id drop not null;

create index if not exists assignments_assigned_by_idx on public.assignments (assigned_by);

-- ---------------------------------------------------------------------------
-- Authorization helper: may the caller assign work to this patient?
--
-- One definition used by both the INSERT and UPDATE checks, so the two can
-- never drift apart. A clinician qualifies through an active caseload link, a
-- parent through a guardian link — nobody else qualifies at all.
-- ---------------------------------------------------------------------------
create or replace function public.can_assign_to(target_patient_id uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select public.is_clinician_of(target_patient_id)
      or public.is_guardian_of(target_patient_id);
$$;

grant execute on function public.can_assign_to(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Replace the over-permissive FOR ALL policy with explicit per-command ones.
--
-- Reading and deleting your own assignments needs only ownership; creating or
-- re-targeting one additionally needs a real relationship to the patient.
-- Splitting by command is what lets the write path carry the stricter rule
-- without also making every read pay for the extra check.
-- ---------------------------------------------------------------------------
drop policy if exists "assignments_clinician_all" on public.assignments;

drop policy if exists "assignments_assigner_select" on public.assignments;
create policy "assignments_assigner_select" on public.assignments
  for select using (assigned_by = auth.uid() or clinician_id = auth.uid());

drop policy if exists "assignments_assigner_insert" on public.assignments;
create policy "assignments_assigner_insert" on public.assignments
  for insert with check (
    assigned_by = auth.uid()
    and public.can_assign_to(patient_id)
  );

drop policy if exists "assignments_assigner_update" on public.assignments;
create policy "assignments_assigner_update" on public.assignments
  for update
  using (assigned_by = auth.uid() or clinician_id = auth.uid())
  with check (
    (assigned_by = auth.uid() or clinician_id = auth.uid())
    and public.can_assign_to(patient_id)
  );

drop policy if exists "assignments_assigner_delete" on public.assignments;
create policy "assignments_assigner_delete" on public.assignments
  for delete using (assigned_by = auth.uid() or clinician_id = auth.uid());

-- assignments_patient_select and assignments_patient_update_status from
-- 0001 are untouched: the child still sees, and still updates the status of,
-- everything assigned to them regardless of who assigned it.
