-- The revokes in 0007 and 0008 did nothing.
--
-- Both ended with `revoke execute ... from anon` (and from authenticated),
-- and the database linter went on reporting every one of those functions as
-- callable without signing in. The reason is that Postgres grants EXECUTE on
-- a new function to PUBLIC by default, and revoking from a role that holds
-- the privilege only via PUBLIC removes nothing — `anon` was still getting in
-- through the PUBLIC grant. The ACLs showed it plainly: `=X/postgres` is the
-- PUBLIC entry, and it was still there after both migrations ran.
--
-- The revoke has to name PUBLIC, and anything that genuinely is called by a
-- signed-in user then needs an explicit grant back.

revoke execute on function public.can_notify(uuid) from public;
revoke execute on function public.handle_new_user() from public;
revoke execute on function public.touch_conversation_on_message() from public;
revoke execute on function public.assignments_patient_status_only() from public;
revoke execute on function public.notify_new_message(uuid, uuid, text, text, text) from public;
revoke execute on function public.create_notification(uuid, text, text, text, text) from public;

-- The application calls these two as the signed-in user, so they need the
-- privilege by name. can_notify does not: it is only ever called from inside
-- the two functions above, which run as their definer.
grant execute on function public.notify_new_message(uuid, uuid, text, text, text) to authenticated;
grant execute on function public.create_notification(uuid, text, text, text, text) to authenticated;

-- The three trigger functions get no grant at all. A trigger fires without
-- checking the invoking user's EXECUTE privilege — the check happens when the
-- trigger is created — so revoking here removes the REST endpoint without
-- disarming the trigger. Verified against the live database: with EXECUTE
-- revoked from PUBLIC, a patient's attempt to rewrite canvas_snapshot is
-- still refused by assignments_patient_status_only, while setting `status`
-- still succeeds.
