-- One assignment, one attempt — enforced by the database.
--
-- submitAttempt already refuses a second attempt, and that covers the case
-- this was written for: the player locks itself when an activity is done, but
-- that lock is a screen, so the same activity open in two tabs could be
-- submitted twice. An application check cannot cover two genuinely
-- simultaneous submissions, though — both read "no attempt yet" before either
-- writes. Only a unique index can.
--
-- This is the model the product already assumes everywhere else: repeating an
-- activity creates a separate assignment per session, precisely so each one
-- can be completed and marked on its own.

-- Deliberately conditional. A unique index on a column that already holds
-- duplicates fails, which would break the migration run — and the alternative,
-- deleting the extra rows to make it apply, would destroy clinical records
-- without anybody having agreed to it. So: apply it when the data allows, and
-- say so clearly when it does not, leaving the decision with a person.
--
-- The application-level guard in submitAttempt stands either way, so skipping
-- this leaves the realistic path closed regardless.
do $$
declare
  duplicate_assignments int;
begin
  select count(*) into duplicate_assignments
  from (
    select assignment_id
    from public.activity_attempts
    group by assignment_id
    having count(*) > 1
  ) d;

  if duplicate_assignments > 0 then
    raise notice
      'Skipping activity_attempts_one_per_assignment: % assignment(s) already have more than one attempt. Review them (select assignment_id, count(*) from public.activity_attempts group by 1 having count(*) > 1), keep the one you want, then re-run this migration.',
      duplicate_assignments;
  else
    create unique index if not exists activity_attempts_one_per_assignment
      on public.activity_attempts (assignment_id);
    raise notice 'activity_attempts_one_per_assignment created.';
  end if;
end $$;
