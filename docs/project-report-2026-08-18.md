# Saarthi Coach — Project Report

**Prepared:** 18 August 2026
**Repository:** `trilochan06/saarthi_coach`
**Branch:** `claude/therapy-authoring-studio-iuigcx`

---

## 1. Executive summary

Saarthi Coach is a web platform for speech and occupational therapy practices. Clinicians
author therapy activities on a visual canvas, assign them to patients, and track results
over time. Patients complete the work in their own account. Parents follow their child's
progress, message the clinician, and author home-practice material themselves.

**Where the project stands today**

| | |
|---|---|
| Signed-in roles | 3 — clinician, patient, parent |
| Routes | 42 |
| Database migrations | 6 |
| Tracked files | 267 |
| Application code | ~23,800 lines of TypeScript / TSX |
| Unit tests | 71, across 9 suites |
| Tracked commit history | 73 commits, 16 July – 18 August 2026 |

The platform is feature-complete for a pilot in its core loop — author, assign, complete,
review — with billing, messaging, analytics, and a parent portal built around it. It has
**not yet been run with real users**, and two of the six migrations are still pending in our
environment (see §8).

> **On metrics:** this report contains no usage or adoption figures. There is no production
> traffic or pilot cohort yet, so any such number would be invented. All figures quoted are
> development output.

---

## 2. What the product does

The core loop:

1. A clinician builds an activity on a canvas — interactive (on screen), hybrid, or printable.
2. They assign it to a patient on their caseload, with instructions and a due date.
3. The patient completes it in their own account; attempts are scored and recorded.
4. The clinician reviews accuracy trends, adds notes, and adjusts what comes next.
5. The parent follows all of this, and can send home practice of their own.

Supporting this are messaging between all three roles, a shared library of published
material, performance analytics, and clinic billing records.

---

## 3. Technical architecture

**Framework** — Next.js 16.2.10 (App Router, Server Components, Server Actions), React 19.2.4,
TypeScript.

**Data and auth** — Supabase: PostgreSQL with Row Level Security as the authorisation
boundary, Supabase Auth, Realtime for live messaging, and Storage for uploaded images.

**UI** — Tailwind CSS v4, Radix UI primitives, Framer Motion, Recharts for analytics,
Lucide icons, Sonner for notifications.

**State** — Zustand for the canvas editor (with undo/redo history), react-hook-form with Zod
for form validation.

**AI** — Anthropic SDK (`@anthropic-ai/sdk`), Claude Sonnet by default.

### Security model

Authorisation lives in the database, not the application. Every table has Row Level Security
policies, and the application queries as the signed-in user, so a missing check in the UI
cannot leak data. Cross-role access is mediated by `security definer` helper functions —
`is_clinician_of`, `is_guardian_of`, `can_assign_to`, `can_bill` — so read and write rules
cannot drift apart.

All migrations are idempotent: re-running one is safe, and is also how a partially applied
database is repaired.

---

## 4. Complete feature inventory

### 4.1 Clinician

**Practice management**
- Dashboard with caseload summary and Clinical Pulse activity band
- Caseload — invite patients by code, per-patient detail pages
- Patient detail — assignments, attempt history, performance analytics, AI insights
- Assignments — every activity assigned across the whole caseload
- Scheduler — calendar of upcoming and overdue due dates
- Billing — issue statements to guardians, mark them paid *(record-keeping only; no payment is taken)*
- Printable Patient Performance Report

**Template Studio**
- Canvas authoring for three mediums: interactive, hybrid, print
- Elements: text, images, audio, shapes, bullet and numbered lists, writing lines, and interactive elements
- Canva-style workspace — contextual selection toolbar, layers panel, properties panel, multi-select, lock, duplicate, undo/redo
- Worksheet Creator — multi-page printable documents with page ruling (blank, ruled, ruled with margin), bold/italic/underline, shapes, colour control, and image upload from device
- Trash with restore and permanent delete
- Publish to the Global Library
- Blueprint Rules — shared authoring standards for the whole team

**Analytics**
- Clinical Pulse — caseload-wide activity and trend band
- Per-patient performance analytics — accuracy over time, domain breakdown, ranking context, status model with explicit reasons
- AI-generated insights from attempt history

### 4.2 Patient
- My Missions — everything assigned, from clinician or parent
- Activity player with scoring and completion tracking
- Progress — accuracy trends plus clinician notes
- Messaging with their clinician

### 4.3 Parent / guardian
- Dashboard — child's status at a glance
- Missions — everything assigned to their child, from either source
- Progress — accuracy over time, with clinician-assigned work and home practice reported **separately**, so the parent never sees a figure their clinician cannot reproduce
- Calendar — due dates by month
- Messages — the parent's own thread with the clinician, distinct from the child's
- Creator Hub — author interactive, hybrid, and printable material on the same canvas clinicians use; browse and save published work; send any of it to their child
- Public/private control on everything they author, public by default
- Finances — statements issued by the clinic *(record only)*
- Child selector for guardians linked to more than one child

### 4.4 Shared and platform-wide
- **Global Library** — public templates, worksheets, and standalone assets, browsable without an account
- **Public Studio** (`/try`) — build on the canvas with no account, then claim the draft on sign-up
- **Messaging** — real-time, with unread badges, live conversation ordering, reconnect reconciliation, and WhatsApp-style relative timestamps
- **Notifications** — live bell with unread counts for assignments, completions, notes, and messages
- **Command palette** — Cmd/Ctrl+K navigation and quick actions
- **Theme** — light/dark, persisted
- **System Map** — per-role documentation of where everything lives
- **Marketing site** — home, about, features, workflow, marketplace, contact

---

## 5. Development history

The tracked repository history begins 16 July 2026. The platform's foundation — auth, the
Template Studio, caseload, assignments, the patient area, the marketing site, and the initial
database schema — was already in place at that point (152 files in the first tracked commit).
What follows is what has been built since.

### Phase 1 — Messaging *(16–18 July)*

A complete messaging system across all roles, built in stages:

- Clinician messaging inside Patient Detail, then a dedicated inbox with list/detail split pane
- Patient Messages with a conversation selector
- Message notifications with deduplication (`reference_id`, `notify_new_message()` RPC)
- Real-time delivery — dispatcher scaffold, live message insertion at correct sort position, live conversation list ordering, live notification bell, live unread badges
- Reconnect reconciliation, so no messages are lost across a dropped connection
- WhatsApp/Telegram-style relative timestamp system

*Defects found and fixed during this phase:* duplicate outgoing messages from asymmetric
deduplication, a Realtime auth race, messages inserted at the wrong position, an unbounded
growing message panel, a mobile detail pane falsely marked active, a notification bell that
never reconciled with fresh server props, and four timestamp bugs found in adversarial review.

### Phase 2 — Analytics and reporting *(26 July)*

- Analytics layer: accuracy, trends, rankings, domains, time windows, summaries — each with its own unit test suite
- Clinical Pulse band on the clinician dashboard, with empty and edge state handling
- Per-patient Performance Analytics
- Status model refined to carry an explicit reason and ranking context rather than a bare label
- Clinician UX refinement pass — AI assistant weighting, Activity tab, Pulse navigation
- Accessibility fixes
- Unified patient attempt fetching into one canonical fetcher
- Printable Patient Performance Report

### Phase 3 — Parent / guardian portal *(5–7 August)*

An entirely new user role, delivered in stages:

- Guardian data model, guardian invite codes, account claiming
- Dashboard, missions, progress, calendar, and a dedicated parent–clinician thread
- Parent authoring of home-practice worksheets, public by default with a private opt-out
- Parents can assign their own material to their own child
- Parent-assigned work made visible to the treating clinician, keeping the child's record complete

*Defects found and fixed:* parent sign-up failing with an opaque `{}` error (a role constraint
rejecting the new value); a constraint swap that could half-apply, made atomic and
column-precise; and setup documentation that instructed running only the first migration,
which would leave any new environment broken.

### Phase 4 — Studio rework *(7 August)*

- Editor reworked into a Canva-style workspace
- Contextual selection toolbar above the canvas, showing controls for whatever is selected
- The existing properties panel was kept intact, so no control became unreachable

### Phase 5 — Access control hardening *(7 August)*

Two authorisation defects identified and closed:

- **Any clinician could assign work to any patient**, regardless of caseload. A blanket policy was replaced with per-command policies gated on a verified care relationship.
- The equivalent gap in the billing model was closed pre-emptively, before that feature shipped.

Both were confirmed by reproducing the unauthorised action against a real database, then
confirming it was refused after the fix.

### Phase 6 — Public access *(16 August)*

- Public `/try` route — the canvas, usable with no account
- Guest drafts held in local storage and claimed on sign-up
- Full audit of the parent portal alongside

*Defects found and fixed:* silent data loss when browser storage was full (the interface
reported "Saved" when nothing had been written), and two dead-end actions that failed only
after the user had committed to them.

### Phase 7 — Billing *(17 August)*

- Clinicians issue statements to the guardians of their own patients and mark them paid
- Scoped by `can_bill()`, so a clinician can only bill guardians of patients they treat
- Made the parent Finances tab functional, which until then had nothing to display

---

## 6. Latest changes

### 6.1 Worksheet Creator replaces the AI generator *(17 August)*

The AI worksheet generator was not working reliably and has been replaced with a direct
authoring canvas: text with bold/italic/underline, bullet and numbered lists, shapes, writing
lines, page ruling (blank / ruled / ruled with margin), colour control for text and shapes,
multi-page documents, and image upload from the user's device.

*The AI drafting endpoint remains in the codebase but is no longer connected to the
interface. It should be re-wired or removed.*

### 6.2 Blueprint Rules *(18 August)*

A shared set of authoring standards every clinician follows, reachable from a control in the
top bar on every clinician screen.

- Ships with **15 baseline rules** covering safety, privacy, instructional clarity, accessibility, and language
- Each is written as one specific, checkable instruction, so the list doubles as worked examples of how to write a rule
- Clinicians add and remove rules for the whole team; any clinician can retire a colleague's rule, since these are collective standards
- The platform defaults **cannot** be deleted — enforced at the database policy level, not merely hidden in the interface
- Parents see the list read-only, since they author material under the same standards

*Currently advisory. Nothing scans content for compliance — the feature publishes the
standard, it does not enforce it.*

### 6.3 Parent authoring extended to activities *(18 August)*

Parents previously could build only printable worksheets — so a child could be sent a page to
print, but never something to work through on screen. Parents now author the same three
mediums clinicians do, on the same canvas, with public/private control on each.

Sending to their own child is independent of that setting: a private activity can still be
assigned. "Public" means *listed in the shared library*, not *required in order to share with
your own child* — two senses of "share" that are easy to conflate, so the interface now
distinguishes them explicitly.

---

## 7. Quality practices

- **Authorisation is verified, not assumed.** Database security rules are exercised against a
  real PostgreSQL instance — attempting the unauthorised action and confirming it is refused —
  rather than reviewed by inspection. This is how both defects in Phase 5 were found, and how
  the parent-authoring permissions were confirmed without needing a new migration.
- **Interfaces are verified in a real browser** against a production build before work is
  reported complete.
- **Adversarial review** of completed work has been a recurring step, and has repeatedly
  found real bugs — four in the timestamp system, two in Realtime reconciliation, and others.
- **Migrations are idempotent**, so re-running one repairs a partially applied database.
- **Automated checks** — type checking, linting, 71 unit tests, and a production build all run
  clean on the current branch.

---

## 8. Deployment status

The following require a database migration before the feature works in a given environment:

| Migration | Feature | Status |
|---|---|---|
| `0001_init.sql` | Core schema, clinician/patient RLS | Applied |
| `0002_parents.sql` | Parent role, guardian links, invoices | Applied |
| `0003_parent_assignments.sql` | Parent assignment + assignment RLS fix | Applied |
| `0004_clinician_sees_home_practice.sql` | Clinician visibility of home practice | Applied |
| `0005_clinician_billing.sql` | Billing / parent Finances | **Pending** |
| `0006_blueprint_rules.sql` | Blueprint Rules | **Pending** |

Until `0005` and `0006` are applied, Billing and Blueprint Rules are built and tested but will
not function. Both are safe to run and safe to re-run.

---

## 9. Known gaps and recommended next steps

1. **Apply the two pending migrations** so Billing and Blueprint Rules go live. *(Immediate.)*
2. **No payment processing.** Billing and Finances are record-keeping only. If taking payment
   is expected, that is a separate piece of work with its own compliance requirements.
3. **Multi-page worksheet export.** Authoring multi-page worksheets works; printing currently
   captures the current view only.
4. **The orphaned AI worksheet endpoint** should be re-wired or removed.
5. **Blueprint Rules are advisory.** Automated content checking would be a separate feature.
6. **No pilot data.** The platform has never been run with real clinicians or patients. A pilot
   is the highest-value next step, and would need instrumentation added first so that future
   reports can carry adoption and outcome figures rather than development output alone.
7. **Managed child accounts.** The parent portal was deliberately built guardian-first; letting
   a parent manage a young child's account directly was deferred and remains open.
