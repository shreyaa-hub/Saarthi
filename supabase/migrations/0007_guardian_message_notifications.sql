-- Guardian threads could not produce a notification.
--
-- notify_new_message() and create_notification() both authorize the caller by
-- looking for an active clinician_patients row joining the sender and the
-- recipient. A parent's thread with their child's clinician has no such row —
-- the parent is not the patient — so every call on a guardian thread raised
-- 'Not authorized to notify this user'. The application swallowed the error,
-- so a parent could message a clinician (and a clinician reply) with neither
-- side ever seeing a notification.
--
-- The relationship that does join them is parent_children -> clinician_patients:
-- the recipient is the clinician on the caseload row behind a guardian link
-- whose parent is the sender, or vice versa. Both functions gain that second
-- path. Neither loosens anything else: the caller must still be one of the two
-- people the relationship is actually between.

-- Shared so the two functions cannot drift apart, and so a third caller gets
-- the same answer. SECURITY DEFINER for the same reason as its siblings: it
-- reads relationship rows the caller may not be able to SELECT directly, and
-- it takes no action of its own beyond returning a boolean about the caller.
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
    );
$$;

create or replace function public.notify_new_message(
  p_recipient_id uuid,
  p_reference_id uuid,
  p_link text,
  p_title text,
  p_body text
)
returns public.notifications
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_row public.notifications;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not public.can_notify(p_recipient_id) then
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

create or replace function public.create_notification(
  p_recipient_id uuid,
  p_type text,
  p_title text,
  p_body text,
  p_link text
)
returns public.notifications
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_row public.notifications;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not public.can_notify(p_recipient_id) then
    raise exception 'Not authorized to notify this user';
  end if;

  insert into public.notifications (user_id, type, title, body, link)
  values (p_recipient_id, p_type, p_title, p_body, p_link)
  returning * into v_row;

  return v_row;
end;
$$;

-- These are only ever called by a signed-in user, and each one's first act is
-- to reject auth.uid() is null. Leaving EXECUTE granted to `anon` gave the
-- database linter a standing warning about SECURITY DEFINER functions reachable
-- without signing in; revoking it removes the reachability rather than relying
-- on the guard inside.
revoke execute on function public.can_notify(uuid) from anon;
revoke execute on function public.notify_new_message(uuid, uuid, text, text, text) from anon;
revoke execute on function public.create_notification(uuid, text, text, text, text) from anon;

-- Trigger functions, never meant to be called over the REST API at all.
revoke execute on function public.handle_new_user() from anon, authenticated;
revoke execute on function public.touch_conversation_on_message() from anon, authenticated;
