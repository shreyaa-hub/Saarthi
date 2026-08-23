-- Verbal Coach — clinicians see home practice
--
-- A parent-assigned worksheet was previously invisible to the child's
-- clinician: 0003 scoped clinician visibility to `clinician_id = auth.uid()`,
-- and a parent assignment has no clinician_id at all. That left the treating
-- clinician unable to see work their patient was actually being given, and
-- unable to see the attempts on it.
--
-- Visibility is now scoped by the care relationship — is_clinician_of(
-- patient_id) — rather than by who happened to create the row. A clinician
-- sees everything assigned to a patient on their caseload, whoever sent it.
-- Provenance is preserved in assigned_by/clinician_id so the UI can label
-- home practice distinctly; it is not hidden.
--
-- Safe to re-run.

-- ---------------------------------------------------------------------------
-- assignments — the treating clinician sees all of their patient's work
-- ---------------------------------------------------------------------------
drop policy if exists "assignments_assigner_select" on public.assignments;
create policy "assignments_assigner_select" on public.assignments
  for select using (
    assigned_by = auth.uid()
    or clinician_id = auth.uid()
    or public.is_clinician_of(patient_id)
  );

-- Deliberately NOT widened for update/delete. Seeing a parent's assignment is
-- clinical oversight; editing or deleting one is not the clinician's to do,
-- and 0003's assigner-scoped write policies already express that.

-- ---------------------------------------------------------------------------
-- activity_attempts — same widening, and for the same reason: an attempt the
-- clinician cannot see would leave a gap in the patient's record with no
-- indication anything was missing.
-- ---------------------------------------------------------------------------
drop policy if exists "activity_attempts_clinician_select" on public.activity_attempts;
create policy "activity_attempts_clinician_select" on public.activity_attempts
  for select using (public.is_clinician_of(patient_id));

-- A clinician may annotate any attempt by a patient they treat, including
-- home practice — a note on "we tried this at home and it went badly" is
-- exactly the kind of thing that belongs in the record.
drop policy if exists "activity_attempts_clinician_update_note" on public.activity_attempts;
create policy "activity_attempts_clinician_update_note" on public.activity_attempts
  for update using (public.is_clinician_of(patient_id));
