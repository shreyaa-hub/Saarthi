# Messenger Phase 2 UX Review

Status: review only — nothing in this document has been implemented yet. Written
after live production testing of Phase 2A (clinician Messages tab inside Patient
Detail), following the resolution of the missing-migration issue (Phase 0's
schema had not been applied to production; see the conversation history for the
diagnosis — the fix was applying `supabase/migrations/0001_init.sql`, not a code
change).

## 1. Auto-scroll bug (confirmed root cause)

**Symptom:** after sending a message, the newest message isn't scrolled into
view. Sending a second message scrolls to the *previous* one instead — the
scroll position is always one message behind.

**Root cause:** in `src/components/clinician/message-thread.tsx`, `handleSend`
appends the new message to state and then schedules a scroll on the next
animation frame:

```ts
setMessages((prev) => [...prev, message]);
requestAnimationFrame(() => {
  const el = scrollRef.current;
  if (el) el.scrollTop = el.scrollHeight;
});
```

`setMessages` only schedules a re-render; it doesn't synchronously update the
DOM. Because this update originates inside an async callback
(`startTransition(async () => {...})`), React isn't guaranteed to have
committed it by the time the `requestAnimationFrame` callback runs. So the
scroll reads `scrollHeight` *before* the new bubble is actually in the DOM,
scrolls to the previous bottom, and the real commit happens afterward —
producing the "always one behind" symptom.

**Fix direction (not yet implemented):** the component already has the
correct pattern next to the bug — the `useEffect(() => {...}, [messages])`
used to preserve scroll position after loading older messages (lines ~79–85)
runs *after* React commits a `messages` change, because it's a reaction to
the state rather than a side effect bolted onto the setter call. The fix is
to route "scroll to bottom after my own send" through that same effect (e.g.
a `shouldScrollToBottomRef` flag set in `handleSend`, consumed by the
effect) instead of the standalone `requestAnimationFrame`.

## 2. Screenshot observations

- **Short-message bubbles render as near-circular blobs.** `rounded-2xl`
  reads fine for a sentence, but for 1–3 character messages ("hi", "gg",
  "kk'") the bubble is barely bigger than the corner radius. Suggest a
  minimum bubble width/padding for very short content.
- **Large empty space above the messages in the clinician thread view.**
  Six short messages don't fill the fixed `h-[32rem]` panel. By the current
  flex/DOM structure they should sit at the top of the scroll container with
  empty space *below*, but the screenshot shows the opposite (bottom-anchored,
  empty space above). Not confidently diagnosed from a screenshot alone —
  needs a live DOM/box-model check before deciding whether it's a real bug
  or an artifact of the test session's message history at capture time.
- **Edit/delete icons behave as designed** — hover-reveal only on the
  hovered row, confirmed working, not a bug.
- **Notification spam is now visibly bad, not just theoretical.** A short
  test burst produced five-plus stacked "New message" notifications (bell
  badge showing 9+), each with a raw, low-signal body (the literal test
  message text). This is the exact limitation documented and deliberately
  deferred in the Phase 1 report (`notifications` RLS is owner-only for both
  SELECT and UPDATE, so real dedup needs a small SECURITY DEFINER RPC we
  chose not to add yet) — now with concrete evidence it should probably be
  prioritized ahead of full Realtime/presence rather than bundled with it.

## 3. Scope proposals raised during this review

- **Patient Messages page.** Patients currently have no dedicated messaging
  entry point — only notifications surface new messages. Proposed: a new
  patient-side route + sidebar entry. `MessageThread` was built
  role-agnostically (props are `conversationId` / `currentUserId` /
  `otherParticipantName`, nothing clinician-specific), so it's likely
  reusable as-is rather than needing a fork. Would need a small
  patient-side "get my conversation with my clinician" data/action path,
  analogous to `startConversation` but keyed off the patient's own
  `clinician_patients` row (`getMyClinician` in `src/lib/data/patient.ts`
  already resolves that relationship).
- **Clinician `/clinician/messages` inbox.** For clinicians with many
  patients, opening each Patient Detail page to check messages won't scale.
  Proposed: a dedicated inbox route listing conversations by most recent
  activity with unread badges, while keeping the existing Patient Detail
  Messages tab as a shortcut. This needs no new backend work — Phase 1's
  `getMyConversations()` and `getUnreadCounts()` (`src/lib/data/messages.ts`)
  were built anticipating exactly this UI; it's purely a new page + nav
  entry + wiring those two functions in.
- Both items are outside Phase 2A's original scope (no new routes, no nav
  changes) and should be planned as their own follow-up unit(s) of work.

## Not yet resolved / needs a live check

- The "empty space above messages" layout observation (item 2 above).
- Whether the composer's send button was genuinely disabled or just
  icon-muted at rest in the screenshots — couldn't tell from a static image.
