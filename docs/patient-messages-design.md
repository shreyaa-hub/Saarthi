# Patient Messages — Design (Step 2)

Status: agreed, not yet implemented. Documentation only. Revised from the
version discussed in conversation to fold in four adjustments: a real
conversation selector instead of silent auto-pick, a numeric unread badge,
a presence-ready conversation header, and a flex-based (not viewport-calc)
page layout.

## 1. Page layout

A new top-level route, `/patient/messages` — a peer of "My Missions" and
"Progress," not nested under anything.

**Layout mechanism: flex, not `calc(100vh-...)`.** Evaluated per your
request — flex works cleanly here with no real downside, and is strictly
better than viewport-height arithmetic:

- The patient shell's `<main className="flex-1 p-4 md:p-6">` is already a
  flex item inside `<div className="flex min-h-screen flex-1 flex-col">`,
  so it already resolves to a definite, correct height at runtime — it
  doesn't need to be `display:flex` itself for a percentage/`h-full` child
  to size correctly against it; CSS only requires the *containing block*
  to have a definite height, which this chain already provides.
- The Messages page's own root becomes `flex h-full flex-col` (the same
  pattern `MessageThread` already uses at its own root), with the header
  and (rare) conversation selector taking their natural height and the
  `Card`/`MessageThread` panel as `flex-1` — it automatically gets
  "whatever's left," with zero magic numbers to keep in sync with topbar
  height, page padding, or future chrome changes.
- One detail that matters: the page root should be `h-full`, not
  `min-h-full`. `min-h-full` would let the page grow taller than the
  viewport and let the *browser* scroll, which would fight with
  `MessageThread`'s own internal `overflow-y-auto` — the thread must stay
  the only scrolling region, with the header and composer pinned in view,
  matching standard chat-app behavior.
- Bonus from this approach: when the rare multi-clinician selector (§5) is
  present, it just adds its natural height above the thread and the
  `flex-1` panel shrinks to match automatically — no conditional height
  math needed for "selector shown vs. not."

No redundant page-title heading (see §8 for how the required `<h1>` is
still satisfied without one being visually shown) — the conversation
header already establishes who the patient is talking to.

## 2. Sidebar entry

Add "Messages" to both `PatientSidebar`'s `links` array *and* the
duplicate list in `PatientTopbar`'s mobile dropdown (two separate arrays
today, not shared — both need the new entry). Position: right after "My
Missions," before "Progress." Icon: `MessageSquare` (`lucide-react`, not
currently used elsewhere in this app).

**Unread indicator: numeric badge, not a bare dot.** Reuses the exact
pattern already established by `NotificationBell`
(`src/components/notification-bell.tsx`): exact count for 1–9, `"9+"`
beyond that. Placement differs from the bell (which overlays a corner dot
on a compact icon-only button) because a sidebar row has a label and more
horizontal room — the badge sits right-aligned at the end of the row,
using the existing `Badge` component, closer to how Slack/Discord show
unread counts on channel names. Sourced from `getUnreadCounts()`
(Phase 1, already built) summed across the patient's conversation(s) —
naturally extends to summing across multiple conversations if §5's
multi-clinician case applies, with no new backend work either way.

## 3. Conversation header

Avatar (`Avatar`/`AvatarFallback` + `initials()`, identical pattern to the
clinician side) and the clinician's `full_name`. No back button — this
page has no parent to return to.

**Designed for future presence, with an honest (not fake) placeholder
today.** Reserve a subtitle line under the name for status. Rather than a
fabricated "Online" label, Step 2 shows a truthful value already available
from Phase 1: `getConversation()` already returns each participant's
`lastReadAt`, so the subtitle can read something like *"Active 2h ago"*
derived from the clinician's `last_read_at` on their `conversation_participants`
row — a real, defensible statement ("your clinician last opened this
conversation 2 hours ago"), not a mock value. When Step 5 (Realtime) lands,
the same subtitle slot gets repointed to real presence (e.g. a green dot +
"Online" while connected to a presence channel, falling back to this same
"Active {relative time}" when not) — the layout requires no rework, only a
data-source swap. This needs no new backend function; `getConversation()`
already returns what's needed.

## 4. Empty states

Two distinct states:

- **No clinician linked at all** (no active `clinician_patients` row) —
  descriptive text only, no thread/composer shell rendered: *"You don't
  have a clinician connected yet. Once you're linked, you'll be able to
  message them here."* No disabled composer left in the DOM — a
  greyed-out-but-present input is a confusing, false affordance,
  especially for screen reader users.
- **Linked, zero messages yet** — already solved: `MessageThread`'s
  existing empty state ("No messages yet — say hello to {name}") is
  reused as-is, no new work.

## 5. Multiple active clinicians

The schema already allows this — `clinician_patients.patient_id` has no
uniqueness constraint, so a patient can have more than one relationship
row today (an archived one plus a new active one, or in principle multiple
concurrently-active ones). Per your direction, the app must not silently
pick one when there's more than one active conversation.

**Design:**
- `getMyClinician()` (`src/lib/data/patient.ts`) currently does
  `.eq("status", "active").maybeSingle()`, which *errors* outright if more
  than one row matches. Step 2 hardens this to fetch all active
  relationships as a list.
- **0 active relationships** → the "no clinician linked" empty state (§4).
- **Exactly 1** → today's simple view, no selector shown at all — visually
  identical to a single-clinician design, zero extra chrome for the common
  case.
- **2 or more** → a conversation selector appears above the conversation
  header: a `Select` (the existing Radix-based `ui/select.tsx` component,
  already used elsewhere in this app) showing the currently-open
  clinician's avatar + name as the trigger, listing all active clinicians
  to switch between. Explicit user choice, never a silent pick.
- **Which conversation is "open"** is carried in a query param on the same
  route (e.g. `/patient/messages?with=<clinicianPatientId>`) rather than
  component-only state, so refresh/back-button/bookmarking behave
  correctly — no new route/segment needed, just a search param on the
  already-approved page.
- The unread badge (§2) sums across *all* active conversations regardless
  of which one is currently open, so a patient with 2 clinicians still
  sees a correct total in the sidebar even while looking at only one
  thread.

## 6. Navigation from notifications

`notifications.link` is `null` today for `new_message` notifications — a
deliberate Phase 1 deferral, since no messaging route existed to point to.
`notification-bell.tsx` already does `if (n.link) router.push(n.link)`, so
no component change is ever needed there — only the *value* written into
`link` changes, and that's Step 4's job, not Step 2's. Deciding the target
now so Step 4 doesn't have to re-derive it: `/patient/messages`, or, once
§5's selector exists, `/patient/messages?with=<clinicianPatientId>` so a
notification from a specific clinician opens directly to that
conversation rather than whichever one happens to be default.

## 7. Responsive behaviour

- **Desktop/tablet:** persistent sidebar stays visible (`md:` breakpoint,
  existing pattern), panel width shrinks naturally; `MessageThread`'s
  bubbles were already verified responsive down to 500px in Step 1.
- **Mobile (below `md`):** sidebar collapses into the topbar's hamburger
  dropdown (existing pattern) — Messages becomes reachable there once the
  new link is added to that list too. With no sidebar competing for width,
  the flex-based thread panel (§1) naturally uses more of the available
  viewport — another advantage of the flex approach over a fixed height,
  since it doesn't need a separate mobile height override.

## 8. Accessibility considerations

- Inherits everything fixed in Step 1: `role="log"` + `aria-live="polite"`
  on the thread, labeled composer, keyboard-focus-visible edit/delete
  controls, adequate touch targets.
- The sidebar's unread badge needs an accessible label (e.g. a
  visually-hidden "(unread)" suffix), since a bare number is ambiguous out
  of context to a screen reader.
- Since the page skips a *visible* redundant "Messages" heading (§1), it
  still needs a real `<h1>` for landmark/screen-reader navigation — a
  visually-hidden `h1` ("Messages") alongside the visible clinician-name
  header, rather than no `h1` at all.
- The "no clinician linked" empty state is plain readable text with no
  dead/disabled interactive elements left in the DOM (§4).
- The conversation selector (§5), when present, is a real `Select` with
  proper labeling (Radix handles most of this out of the box) — not a
  custom dropdown reinventing keyboard/focus handling.
