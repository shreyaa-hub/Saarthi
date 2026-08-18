# Verbal Coach — Project Report

**Internship period:** 10 May – 3 July 2026
**Status:** All work completed

---

## 1. Overview

Verbal Coach is a web platform for speech and occupational therapy practices. It supports the
complete therapy workflow: clinicians author therapy activities on a visual canvas, assign
them to patients, and review the results; patients complete the work in their own accounts;
and parents follow their child's progress and contribute home practice of their own.

The platform serves three signed-in roles across 42 routes, backed by a PostgreSQL database
with row-level security governing every table.

| | |
|---|---|
| Signed-in roles | 3 — clinician, patient, parent |
| Routes | 42 |
| Database migrations | 6 |
| Application code | ~23,800 lines of TypeScript / TSX |
| Automated unit tests | 71, across 9 suites |

All planned work for the internship period has been completed and delivered.

---

## 2. The core workflow

1. A clinician builds an activity on a canvas — interactive, hybrid, or printable.
2. They assign it to a patient on their caseload, with instructions and a due date.
3. The patient completes it in their own account; responses are scored and recorded.
4. The clinician reviews accuracy trends, adds notes, and adjusts what comes next.
5. The parent follows all of this, and can send home practice of their own.

Around this loop sit messaging between all three roles, a shared library of published
material, performance analytics, and clinic billing records.

---

## 3. Clinician features

### Practice management
- Dashboard with caseload summary and a Clinical Pulse activity band
- Caseload management with code-based patient invitations
- Per-patient detail pages showing assignments, attempt history, performance analytics, and AI insights
- Consolidated assignments view across the entire caseload
- Scheduler presenting upcoming and overdue due dates in a calendar layout
- Billing module for issuing statements to guardians and recording payment
- Printable Patient Performance Report

### Template Studio
- Canvas-based authoring across three mediums: interactive, hybrid, and print
- Full element library — text, images, audio, shapes, bulleted and numbered lists, writing lines, and interactive response elements
- Canva-style workspace with a contextual selection toolbar, layers panel, properties panel, multi-select, element locking, duplication, and full undo/redo history
- Worksheet Creator for multi-page printable documents, with page ruling options (blank, ruled, ruled with margin), bold/italic/underline formatting, shapes, colour control, and image upload from the user's device
- Trash with restore and permanent deletion
- Publication of finished templates to the Global Library
- **Updated** — a shared set of authoring standards applied across the clinical team, seeded with fifteen baseline rules spanning safety, privacy, instructional clarity, accessibility, and language. Clinicians add and remove rules for the whole team; platform defaults are protected at the database level. Parents see the list read-only, since they author material under the same standards.

### Analytics and reporting
- Clinical Pulse providing caseload-wide activity and trend visibility
- Per-patient performance analytics covering accuracy over time, domain breakdown, ranking context, and a status model that carries an explicit reason for each classification
- AI-generated clinical insights derived from patient attempt history

---

## 4. Patient features

- My Missions, presenting all assigned activities from both clinician and parent
- Activity player with response scoring and completion tracking
- Progress view showing accuracy trends alongside clinician notes
- Direct messaging with their clinician

---

## 5. Parent and guardian features

- Dashboard summarising the child's current status
- Missions view covering everything assigned to the child from either source
- Progress reporting that presents clinician-assigned therapy and home practice as separate figures, so parent and clinician always work from consistent numbers
- Calendar of activity due dates by month
- A dedicated message thread with the clinician, held separately from the child's own
- Creator Hub for authoring interactive, hybrid, and printable material on the same canvas clinicians use, browsing and saving published work, and sending any of it to the child
- Public and private visibility control on all authored material
- Finances view listing statements issued by the practice
- Child selector for guardians linked to more than one child

---

## 6. Platform-wide features

- **Global Library** — publicly browsable templates, worksheets, and reusable assets
- **Public Studio** — the full canvas available without an account, with drafts preserved locally and transferred to the user's account on registration
- **Real-time messaging** across all roles, with unread badges, live conversation ordering, reconnect reconciliation, and relative timestamp formatting
- **Live notifications** for assignments, completions, clinician notes, and messages
- **Command palette** offering keyboard-driven navigation and quick actions
- **Light and dark themes**, persisted across sessions
- **System Map** documenting every feature location, tailored per role
- **Marketing site** — home, about, features, workflow, marketplace, and contact pages

---

## 7. Technical foundation

**Framework** — Next.js 16 with React 19 and TypeScript, using Server Components and Server
Actions throughout.

**Data and authentication** — Supabase, providing PostgreSQL, authentication, real-time
delivery, and file storage.

**Security** — Authorisation is enforced in the database through row-level security policies
rather than in application code, so access rules apply consistently regardless of the calling
path. Cross-role access is mediated by dedicated helper functions, keeping read and write
rules aligned. All database migrations are idempotent and safe to re-run.

**Interface** — Tailwind CSS v4 with Radix UI primitives, Framer Motion, Recharts for data
visualisation, and Zustand for canvas editor state.

**AI** — Anthropic Claude API, powering clinical insight generation.

**Quality assurance** — 71 automated unit tests, static type checking, linting, database
security policies verified directly against a live PostgreSQL instance, and browser
verification of interface changes against production builds.

---

## 8. Delivery timeline

| Period | Delivered |
|---|---|
| **10 – 24 May** | Core platform — authentication, role-based access, Template Studio with canvas authoring, caseload management, assignment workflow, patient activity player, and the public marketing site |
| **25 May – 7 June** | Messaging across all roles — clinician inbox, patient messaging, real-time delivery, unread badges, live conversation ordering, reconnect reconciliation, and relative timestamp formatting |
| **8 – 21 June** | Analytics and reporting — analytics layer, Clinical Pulse, per-patient performance analytics, AI clinical insights, and the printable Patient Performance Report |
| **22 June – 3 July** | Parent and guardian portal; Canva-style Studio workspace; public no-account Studio access; clinician billing; Worksheet Creator with multi-page authoring; **Updated** authoring standards; and parent authoring extended to interactive and hybrid activities |

---

## 9. Handover

The following are ready for transfer:

- **Source repository** — complete codebase with full commit history and documentation
- **Database** — schema and all six migrations, each idempotent and safe to re-run
- **Setup documentation** — README covering environment configuration and migration order

Hosting credentials are required from your side to complete the deployment transfer.
