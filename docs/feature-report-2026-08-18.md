# Saarthi Coach — Platform Feature Report

**Reporting period:** 4–18 August 2026 (14 days)
**Prepared:** 18 August 2026
**Branch:** `claude/therapy-authoring-studio-iuigcx`

---

## 1. Summary

Saarthi Coach is a web platform for speech and occupational therapy practices. Clinicians
author therapy activities on a visual canvas, assign them to patients, and track results.
Patients complete the work in their own account. Parents follow their child's progress and
now author home-practice material themselves.

The platform currently has **42 routes across three signed-in roles** plus a public
marketing and library area, backed by **6 database migrations**.

In the last 14 days the team delivered **22 commits, 97 files changed, ~6,900 lines added**.
The period covered one major new user role (parents), a rebuild of the authoring workspace,
a new billing module, a shared authoring-standards feature, and the closure of two access
control defects.

> **Note on metrics:** this report contains no usage or adoption figures. The product has no
> production traffic or pilot cohort yet, so any such numbers would be invented. Figures
> quoted are development output only.

---

## 2. Platform overview

### 2.1 Roles

| Role | Purpose |
|---|---|
| **Clinician** | Authors activities, manages a caseload, assigns work, reviews results, bills guardians |
| **Patient** | Completes assigned activities, views their own progress |
| **Parent / Guardian** | Follows their child's progress, authors home practice, messages the clinician, views statements |

### 2.2 Clinician features

**Practice management**
- Dashboard with caseload and activity summary
- Caseload management — invite patients by code, per-patient detail pages
- Assignments view across the whole caseload
- Scheduler — calendar of upcoming and overdue due dates
- Billing — issue statements to guardians and mark them paid *(record-keeping only; no payment is taken)*
- Printable patient performance report

**Template Studio**
- Canvas-based authoring for three mediums: interactive (on screen), hybrid, and print
- Element types: text, images, audio, shapes, lists, writing lines, and interactive elements
- Canva-style workspace — contextual selection toolbar, layers, properties panel, undo/redo
- Worksheet Creator — multi-page printable worksheets with page ruling (blank, ruled, ruled with margin), bold/italic/underline, bullet and numbered lists, shapes, colours, and device image upload
- Trash with restore and permanent delete
- Blueprint Rules — shared authoring standards the whole team follows

**AI**
- AI-generated patient insights from attempt history, on the patient detail page (Claude API)

### 2.3 Patient features
- My Missions — activities assigned by clinician or parent
- Activity player with attempt scoring
- Progress — accuracy trends over time plus clinician notes
- Messaging with their clinician

### 2.4 Parent features
- Dashboard — child's status at a glance
- Missions — everything assigned to their child, from either source
- Progress — accuracy over time, with clinician-assigned and home practice reported separately
- Calendar — due dates by month
- Messages — the parent's own thread with the clinician, separate from the child's
- Creator Hub — author interactive, hybrid, and printable material; browse and save published work; send any of it to their child
- Finances — statements issued by the clinic *(record only)*
- Child selector for guardians linked to more than one child

### 2.5 Shared across roles
- Global Library — public templates, worksheets, and assets
- Public "try the Studio" route — build on the canvas without an account, then claim the draft on sign-up
- Command palette (Cmd/Ctrl+K), notification bell, real-time messaging, light/dark theme
- Per-role System Map documenting where everything lives

---

## 3. Changes in the last 14 days

### 3.1 Parent / guardian portal — new role *(5–7 Aug)*

The largest item of the period: an entirely new user role, delivered in stages.

- Guardian data model, guardian invite codes, and account claiming
- Dashboard, missions, progress, calendar, and a dedicated parent–clinician message thread
- Parent authoring of home-practice worksheets, public by default with a private opt-out
- Parents can assign their own material to their own child
- Parent-assigned work is visible to the treating clinician, so the child's record stays complete

**Defects found and fixed during this work**
- Parent sign-up failed with an opaque `{}` error — a role constraint rejected the new `parent` value. The constraint swap was also made atomic and column-precise so it cannot half-apply.
- Setup documentation instructed running only the first migration, which would leave any new environment broken.

### 3.2 Access control fixes *(7 Aug)*

Two authorisation defects were identified and closed while extending the assignment model:

- **Any clinician could assign work to any patient**, regardless of whether that patient was on their caseload. Replaced a blanket policy with per-command policies gated on a verified care relationship.
- The equivalent gap in the billing model was closed pre-emptively before that feature shipped.

Both were confirmed by reproducing the unauthorised action against a real database, then confirming it was refused after the fix.

### 3.3 Studio rebuilt as a Canva-style workspace *(7 Aug)*

- Reworked editor layout with a contextual selection toolbar above the canvas
- Controls surface for whatever is selected; the existing properties panel was kept intact, so nothing became unreachable

### 3.4 Public Studio access *(16 Aug)*

- Anyone can now use the canvas without an account at `/try`, and is prompted to register to save
- Guest drafts are held locally and claimed on sign-up
- Full audit of the parent portal alongside

**Defects found and fixed:** silent data loss when browser storage was full (the UI reported "Saved" when nothing had been written), plus two dead-end actions that failed only after the user had committed to them.

### 3.5 Clinician billing *(17 Aug)*

- Clinicians issue statements to the guardians of their own patients and mark them paid
- Scoped so a clinician can only bill guardians of patients they actually treat
- This made the parent Finances tab functional, which until then had nothing to display

### 3.6 Worksheet Creator replaces the AI generator *(17 Aug)*

The AI worksheet generator was not working reliably and has been replaced with a direct
authoring canvas offering text with bold/italic/underline, bullet and numbered lists,
shapes, writing lines, page ruling (blank / ruled / ruled with margin), colour control,
multi-page documents, and image upload from the user's device.

*The AI drafting endpoint remains in the codebase but is no longer connected to the
interface. It should either be re-wired or removed.*

### 3.7 Blueprint Rules *(18 Aug)*

A shared set of authoring standards every clinician follows, reachable from the top bar on
every clinician screen. Ships with 15 baseline rules covering safety, privacy, instructional
clarity, accessibility, and language — each written as a specific, checkable instruction so
they double as worked examples. Clinicians add and remove rules for the whole team; the
platform defaults cannot be deleted. Parents see the list read-only, since they author
material under the same standards.

*Currently advisory. Nothing scans content for compliance — the feature publishes the
standard, it does not enforce it.*

### 3.8 Parent authoring extended to activities *(18 Aug)*

Parents previously could only build printable worksheets. They now author the same three
mediums clinicians do — interactive, hybrid, and print — on the same canvas, with
public/private control on each. Sending to their own child works regardless of that
setting; "public" means listed in the shared library, not required in order to share with
their own child.

---

## 4. Deployment status

The following require a database migration to be applied before the feature is usable in a
given environment:

| Migration | Feature | Status |
|---|---|---|
| `0001`–`0004` | Core platform, parent portal, assignment fixes | Applied |
| `0005_clinician_billing.sql` | Billing / parent Finances | **Pending** |
| `0006_blueprint_rules.sql` | Blueprint Rules | **Pending** |

Until these are applied, Billing and Blueprint Rules are built and tested but will not
function. All migrations are safe to re-run.

---

## 5. Engineering practice

- **Access control is verified, not assumed.** Database security rules are exercised against
  a real PostgreSQL instance — attempting the unauthorised action and confirming refusal —
  rather than reviewed by inspection. This is how both defects in §3.2 were found.
- **Interfaces are verified in a real browser** against a production build before work is
  reported complete.
- **Migrations are idempotent**, so re-running one is also how a partially-applied database
  is repaired.
- Automated checks: type checking, linting, 71 unit tests, and a production build run clean
  on the current branch.

---

## 6. Known gaps and suggested next steps

1. **Apply the two pending migrations** so Billing and Blueprint Rules go live.
2. **No payment processing.** Billing and Finances are record-keeping only. If taking payment
   is expected, that is a separate piece of work.
3. **Multi-page worksheet export.** Authoring multi-page worksheets works; printing currently
   captures the current view only.
4. **The orphaned AI worksheet endpoint** should be re-wired or removed.
5. **Blueprint Rules are advisory.** Automated content checking would be a separate feature.
6. **No usage data.** Once a pilot cohort exists, instrumentation would let future reports
   carry adoption and outcome figures rather than development output alone.
