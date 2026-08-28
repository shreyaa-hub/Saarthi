-- A patient could rewrite their own clinical record, and the activity they
-- were set.
--
-- Two holes, both confirmed against the live database by acting as a real
-- patient inside a rolled-back transaction.
--
-- 1. activity_attempts_patient_all was FOR ALL on (patient_id = auth.uid()),
--    and `authenticated` held UPDATE on every column. One REST call let a
--    patient set their own score to 100, replace `responses` with anything,
--    overwrite the clinician's note on their own attempt, or DELETE the
--    attempt outright. The per-question review reads `responses`, so this
--    also meant the record a clinician now reads was patient-writable.
--
-- 2. assignments_patient_update_status is named for the one column a patient
--    should be able to change, but an RLS policy cannot restrict columns and
--    `authenticated` held UPDATE on all of them — including canvas_snapshot.
--    A patient could rewrite the answer key of an activity before doing it
--    and then score full marks legitimately.
--
-- Neither is a privilege-escalation across users: the with_check clauses did
-- keep a patient inside their own rows. It is an integrity problem, which for
-- a clinical record is the one that matters — an attempt is evidence, and
-- evidence the subject can edit is not evidence.

-- --------------------------------------------------------------------------
-- 1. Attempts: a patient may read and create their own, and nothing else.
-- --------------------------------------------------------------------------

drop policy if exists "activity_attempts_patient_all" on public.activity_attempts;

create policy "activity_attempts_patient_select" on public.activity_attempts
  for select using (patient_id = auth.uid());

-- The patient still records their own attempt when they finish an activity;
-- that INSERT is the only write they need. Nothing here lets them come back
-- and change it afterwards.
create policy "activity_attempts_patient_insert" on public.activity_attempts
  for insert with check (patient_id = auth.uid());

-- No UPDATE or DELETE policy for the patient, so both are refused outright.

-- The clinician's UPDATE policy is named activity_attempts_clinician_update_note
-- and should be able to do exactly that. Because a policy cannot limit which
-- columns an UPDATE touches, the limit has to be a column grant — without
-- this, that policy also permitted a clinician to quietly rewrite a score,
-- which would corrupt every accuracy figure derived from it.
revoke update on public.activity_attempts from authenticated;
grant update (clinician_note) on public.activity_attempts to authenticated;

-- Note on what this leaves: a patient may still *issue* an UPDATE touching
-- only clinician_note, because the grant is role-wide. It matches zero rows —
-- there is no patient UPDATE policy for RLS to satisfy — so it changes
-- nothing. Verified: that probe reports 0 rows affected while every other
-- patient UPDATE is refused outright at the privilege level.

-- Nothing in the application deletes an attempt, and a clinical record should
-- not disappear. Belt and braces alongside the missing DELETE policy.
revoke delete on public.activity_attempts from authenticated, anon;

-- --------------------------------------------------------------------------
-- 2. Assignments: a patient may move the status along, and change nothing else.
-- --------------------------------------------------------------------------

-- A column grant cannot express this one, because the assigner legitimately
-- edits the same columns the patient must not — and grants apply to the whole
-- `authenticated` role, not per policy. A trigger is the only place that can
-- see both who is acting and which columns actually changed.
create or replace function public.assignments_patient_status_only()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  -- Server-side work with no end user attached (migrations, cascades, the
  -- service role) is not what this guards.
  if auth.uid() is null then
    return new;
  end if;

  -- The people who own the assignment may edit it freely.
  if auth.uid() = old.assigned_by or auth.uid() = old.clinician_id then
    return new;
  end if;

  -- Anyone else who got this far is the patient, via
  -- assignments_patient_update_status. Comparing whole rows minus `status`
  -- rather than listing columns means a column added later is protected by
  -- default, instead of quietly becoming patient-writable.
  if auth.uid() = old.patient_id
     and (to_jsonb(new) - 'status') is distinct from (to_jsonb(old) - 'status') then
    raise exception 'A patient may only change an assignment''s status';
  end if;

  return new;
end;
$$;

drop trigger if exists assignments_patient_status_only on public.assignments;
create trigger assignments_patient_status_only
  before update on public.assignments
  for each row execute function public.assignments_patient_status_only();

revoke execute on function public.assignments_patient_status_only() from anon, authenticated;
