# Messenger Implementation Roadmap

Status: agreed, not yet implemented. Supersedes the original Phase 2A/2B/2C
sequencing discussed earlier — Realtime is now deliberately last, after the
non-realtime messaging product is finished. See
`docs/messenger-phase2-ux-review.md` for the live-testing findings that
prompted this reordering (most notably: notification spam is real and
visible today, not just a theoretical Phase 1 limitation).

## Order

1. **UX polish** — auto-scroll fix, message-bubble sizing for short content,
   the unexplained empty-space layout question, general chat polish. Purely
   presentational; no backend dependency.
2. **Patient Messages page**, with sidebar navigation. Reuses
   `MessageThread` (already role-agnostic) and `startConversation()`
   (already symmetric — callable by either the clinician or the patient side
   of a relationship, per its existing `auth.uid() <> v_clinician_id and
   auth.uid() <> v_patient_id` check).
3. **Clinician Messages inbox** — `/clinician/messages`, conversation list
   sorted by most recent activity, unread badges, latest-message preview,
   search — while keeping the Patient Detail Messages tab as a shortcut.
   Built on Phase 1's `getMyConversations()` / `getUnreadCounts()`, already
   designed for this; no new backend work expected.
4. **Notification improvements** — real, clickable links (`notifications.link`
   is `null` today, deliberately, since no messaging routes existed yet) and
   addressing the dedup/spam problem confirmed during live testing. Placed
   after steps 2–3 specifically so real routes exist to link to.
5. **Realtime** — typing indicators, presence, read receipts, live updates.
   Last, since nothing in steps 1–4 depends on it, and the schema was
   already designed in the Phase 2 architecture review to not need
   redesigning for any of this.

## Dependency notes confirmed during roadmap review

- Steps 2 and 3 are independent of each other and can be built in either
  order without conflict.
- Step 4 genuinely benefits from following steps 2–3 (rather than preceding
  them or bundling with step 5) — it's the first point at which real
  in-app URLs exist for notifications to link to.
- Step 3's unread badges (`getUnreadCounts()`, derived from
  `messages`/`conversation_participants.last_read_at`) are entirely
  independent of the `notifications` table, so step 3 doesn't need to wait
  on step 4's dedup fix to show correct counts.
- Step 5 requires no schema changes: `conversation_participants.last_read_at`
  already functions as a non-realtime read receipt; presence typically
  doesn't need persisted schema at all (ephemeral channel state).

## Known small additions expected along the way (not schema/RLS changes)

- Step 2: `getMyClinician()` (`src/lib/data/patient.ts`) needs to also
  select the `clinician_patients.id` row id, which `startConversation()`
  requires and which the function doesn't currently fetch. One-line
  addition; the patient's existing RLS already permits reading it.
- Step 3: "search" should be client-side filtering over the already-fetched
  conversation list, matching this app's existing convention
  (`CaseloadList`'s search is client-side), not a new server-side search
  endpoint — worth confirming at implementation time.
- Step 4: real notification deduplication still requires the small
  SECURITY DEFINER RPC discussed and deferred during Phase 1
  (`notifications`' RLS is owner-only for both SELECT and UPDATE, so a
  sender's session can't read or coalesce another user's notification row
  without one). This is independent of Realtime/presence, so building it
  here rather than in step 5 is consistent with the RLS model already in
  place.
