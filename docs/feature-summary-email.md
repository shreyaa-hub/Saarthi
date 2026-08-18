# Feature Summary Email — Saarthi Coach

**Subject:** Saarthi Coach — Complete Feature Summary

---

Dear [Manager's name],

Please find below a consolidated summary of Saarthi Coach and the full set of capabilities
delivered to date.

Saarthi Coach is a web platform for speech and occupational therapy practices. It supports
the complete therapy workflow: clinicians author therapy activities on a visual canvas,
assign them to patients, and review the results; patients complete the work in their own
accounts; and parents follow their child's progress and contribute home practice of their
own. The platform serves three distinct signed-in roles across 42 routes, supported by a
PostgreSQL database with row-level security governing every table.

## Clinician capabilities

**Practice management**
- Dashboard with a caseload summary and a Clinical Pulse activity band
- Caseload management with code-based patient invitations and per-patient detail pages
- Per-patient view of assignments, attempt history, performance analytics, and AI insights
- Consolidated assignments view across the entire caseload
- Scheduler presenting upcoming and overdue due dates in a calendar layout
- Billing module for issuing statements to guardians and recording payment
- Printable Patient Performance Report

**Template Studio**
- Canvas-based authoring across three mediums: interactive, hybrid, and print
- Full element library: text, images, audio, shapes, bulleted and numbered lists, writing
  lines, and interactive response elements
- Canva-style workspace featuring a contextual selection toolbar, layers panel, properties
  panel, multi-select, element locking, duplication, and full undo/redo history
- Worksheet Creator for multi-page printable documents, with page ruling options (blank,
  ruled, ruled with margin), bold/italic/underline formatting, shapes, colour control, and
  image upload from the user's device
- Trash with restore and permanent deletion
- Publication of finished templates to the Global Library
- Blueprint Rules — a shared set of authoring standards applied across the clinical team,
  seeded with fifteen baseline rules spanning safety, privacy, instructional clarity,
  accessibility, and language

**Analytics and reporting**
- Clinical Pulse providing caseload-wide activity and trend visibility
- Per-patient performance analytics covering accuracy over time, domain breakdown, ranking
  context, and a status model that carries an explicit reason for each classification
- AI-generated clinical insights derived from patient attempt history

## Patient capabilities
- My Missions, presenting all assigned activities from both clinician and parent
- Activity player with response scoring and completion tracking
- Progress view showing accuracy trends alongside clinician notes
- Direct messaging with their clinician

## Parent and guardian capabilities
- Dashboard summarising their child's current status
- Missions view covering everything assigned to their child from either source
- Progress reporting that presents clinician-assigned therapy and home practice as separate
  figures, ensuring the parent and the clinician always work from consistent numbers
- Calendar of activity due dates by month
- A dedicated message thread with the clinician, held separately from the child's own
- Creator Hub for authoring interactive, hybrid, and printable material on the same canvas
  clinicians use, browsing and saving published work, and sending any of it to their child
- Public and private visibility control on all authored material
- Finances view listing statements issued by the practice
- Child selector for guardians linked to more than one child

## Platform-wide capabilities
- **Global Library** — publicly browsable templates, worksheets, and reusable assets
- **Public Studio** — the full canvas available without an account, with drafts preserved
  locally and transferred to the user's account on registration
- **Real-time messaging** across all roles, with unread badges, live conversation ordering,
  reconnect reconciliation, and relative timestamp formatting
- **Live notifications** for assignments, completions, clinician notes, and messages
- **Command palette** offering keyboard-driven navigation and quick actions
- **Light and dark themes**, persisted across sessions
- **System Map** documenting every feature location, tailored per role
- **Marketing site** comprising home, about, features, workflow, marketplace, and contact pages

## Technical foundation

The platform is built on Next.js 16 with React 19 and TypeScript, using Server Components and
Server Actions throughout. Data, authentication, real-time delivery, and file storage are
provided by Supabase. Authorisation is enforced in the database through row-level security
policies rather than in application code, so access rules are applied consistently regardless
of the calling path. The interface uses Tailwind CSS v4 with Radix UI primitives, Recharts for
data visualisation, and Zustand for canvas editor state. AI features are powered by the
Anthropic Claude API.

Quality is maintained through 71 automated unit tests, static type checking, linting, database
security policies verified directly against a live PostgreSQL instance, and browser
verification of interface changes against production builds.

## Development milestones

| Period | Delivered |
|---|---|
| July | Real-time messaging across all roles; analytics layer, Clinical Pulse, per-patient performance analytics, and the printable performance report |
| Early August | Parent and guardian portal, including the guardian model, dashboard, progress, calendar, messaging, and home-practice authoring |
| Mid August | Canva-style Studio workspace; public no-account Studio access; clinician billing |
| Latest | Worksheet Creator with full multi-page authoring; Blueprint Rules for shared authoring standards; parent authoring extended to interactive and hybrid activities |

I would be glad to arrange a walkthrough or provide any further detail you would find useful.

Kind regards,
Trilochan
