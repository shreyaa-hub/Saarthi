-- A parent and their own child could not notify each other.
--
-- can_notify() (0007) knows three relationships: yourself, a clinician and
-- their patient, and a clinician and that patient's guardian. It does not
-- know the most obvious one of all — a parent and their own child — so both
-- halves of home practice were silent:
--
--   * A parent assigns a worksheet. assignParentWorksheet notifies the child,
--     create_notification refuses it, notify() swallows the error by design,
--     and the child is never told there is work waiting.
--   * The child finishes it. submitAttempt notifies assigned_by, which for
--     home practice is the parent, and that is refused the same way — so the
--     parent never learns their child did it.
--
-- Neither surfaced as an error anywhere, because a failed notification must
-- never block the action that triggered it. It just quietly did nothing.
--
-- parent_children is the relationship, and it needs no status column the way
-- clinician_patients does: a guardian link only exists once it has been
-- claimed with a guardian code.
create or replace function public.can_notify(target_recipient_id uuid)
returns boolean
language sql
security definer
set search_path to 'public'
as $$
  select
    auth.uid() = target_recipient_id
    -- Clinician <-> their patient.
    or exists (
      select 1 from public.clinician_patients cp
      where cp.status = 'active'
        and ((cp.clinician_id = auth.uid() and cp.patient_id = target_recipient_id)
          or (cp.patient_id = auth.uid() and cp.clinician_id = target_recipient_id))
    )
    -- Clinician <-> the guardian of one of their patients.
    or exists (
      select 1
      from public.parent_children pc
      join public.clinician_patients cp on cp.id = pc.clinician_patient_id
      where cp.status = 'active'
        and ((pc.parent_id = auth.uid() and cp.clinician_id = target_recipient_id)
          or (cp.clinician_id = auth.uid() and pc.parent_id = target_recipient_id))
    )
    -- Parent <-> their own child.
    or exists (
      select 1 from public.parent_children pc
      where (pc.parent_id = auth.uid() and pc.child_id = target_recipient_id)
        or (pc.child_id = auth.uid() and pc.parent_id = target_recipient_id)
    );
$$;

-- CREATE OR REPLACE keeps the existing ACL, so the revoke from PUBLIC that
-- 0009 applied to this function still stands. Stated rather than assumed,
-- because 0007 and 0008 were both written believing a revoke had taken when
-- it had not.
