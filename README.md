# Saarthi Coach — Therapy Authoring Studio

Project contributors: Trilochan P, Abhinav Y, Rahul Anand Y, Shreya S, B. V. A. S. Kowshik

A canvas-based authoring studio for clinicians: build interactive therapy activities,
assign them to patients, and monitor progress with AI-assisted insight.

**Stack:** Next.js 16 (App Router, TypeScript, Tailwind v4) · Supabase (Postgres, Auth) ·
Anthropic Claude (progress insights) · zustand (canvas editor state) · recharts

## What's built

- **Public marketing site** — home, features, workflow, about, contact, and stub pages for
  the library/marketplace areas from the sitemap.
- **Auth** — email/password sign-up with role selection (clinician / patient / parent),
  role-aware middleware route protection.
- **Clinician workspace** — dashboard, caseload (invite-code based patient linking), and a
  drag-and-drop canvas **Template Studio** with 9 element types (text, image, shape, audio,
  button, multiple choice, fill-in-the-blank, drag-to-match, sequencing), autosave, and
  publish/draft states.
- **Assignment flow** — assign a published template to a patient with instructions and a due
  date. Each assignment snapshots the canvas so later template edits don't retroactively
  change work already assigned.
- **Patient portal** — a mission list with streaks, and a focused full-screen activity player
  that renders the assigned canvas, captures responses, auto-scores, and submits an attempt.
- **Progress monitoring** — an accuracy-over-time chart per patient, plus an **AI insights**
  panel that asks Claude to summarize recent attempts into strengths / concerns /
  recommendations for the clinician (never shown to the patient).

- **Parent area** — a guardian links to an existing patient account with a clinician-issued
  guardian code (separate from the patient's own invite code, which would otherwise let a
  parent *become* the patient). Dashboard, missions, progress, calendar, a parent↔clinician
  message thread kept separate from the child's, a home-practice worksheet shortlist, and a
  read-only statements view. A Child Selector switches between children.

Out of scope for this pass (present in the sitemap, not built): the Admin console,
marketplace, wallets/points, gamification, and localization. Nav links to those areas render
a "coming soon" page rather than 404ing. Parent **Finances** is a record only — there is no
payment processing anywhere in the product, and nothing charges a card.

## Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project (free tier is fine)
- An [Anthropic API key](https://console.anthropic.com) for the AI insights feature (optional
  — everything else works without it)

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Create a Supabase project**, then open **SQL Editor** in the dashboard and run every
   file in [`supabase/migrations/`](./supabase/migrations) **in filename order**:

   | File | What it adds |
   | --- | --- |
   | `0001_init.sql` | Tables, `handle_new_user` / `claim_invite`, and the clinician/patient RLS policies. |
   | `0002_parents.sql` | The `parent` role, guardian links, `claim_guardian_code`, invoices, and saved worksheets. |

   Every file is idempotent, so re-running one is safe — that is also how you repair a
   database left in a partial state by a failed run.

   Skipping a migration does not fail loudly at startup; it fails at the first feature that
   needs it. Skipping `0002` in particular leaves `profiles.role` rejecting `'parent'`, so
   parent sign-up fails inside the `handle_new_user` trigger, which Supabase reports only as
   an opaque auth error.

   Alternatively, apply them from the command line:

   ```bash
   psql "$DATABASE_URL" -f supabase/migrations/0001_init.sql
   psql "$DATABASE_URL" -f supabase/migrations/0002_parents.sql
   ```

   (`DATABASE_URL` is the connection string under **Project Settings → Database**.)

   The policies were exercised against a local Postgres instance during development
   (clinician/patient data isolation, cross-tenant access denial, invite-claim flow) — see
   each migration file's comments for what its policies do.

3. **Copy env vars**

   ```bash
   cp .env.local.example .env.local
   ```

   Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from
   **Project Settings → API**. Add `ANTHROPIC_API_KEY` to enable the AI insights panel.

4. **Turn off email confirmation for local testing** (optional but recommended): in
   **Authentication → Providers → Email**, disable "Confirm email" so sign-up logs you in
   immediately instead of waiting on a confirmation email.

5. **Run the dev server**

   ```bash
   npm run dev
   ```

   Visit `http://localhost:3000`. Sign up as a clinician, generate a patient invite code from
   **Caseload → Add patient**, then sign up a second (incognito) session as a patient using
   that code to see the full loop.

## Deploying

The app is a standard Next.js app — deploy to Vercel by importing the repo and setting the
same three environment variables in the project's settings. No build-step changes needed.

## Project structure

```
src/app/(marketing)/        Public site
src/app/(auth)/             Sign in / sign up
src/app/(clinician-shell)/  Clinician dashboard, caseload, studio list, assignments
src/app/clinician/studio/[templateId]/   Full-screen canvas editor (own layout, no sidebar)
src/app/(patient-shell)/    Patient dashboard, progress
src/app/patient/activity/[assignmentId]/ Full-screen activity player
src/app/api/ai/insights/    AI insights generation endpoint
src/components/canvas/      Authoring canvas (editor, palette, properties panel)
src/components/player/      Activity player (interactive element renderers)
src/lib/types/canvas.ts     Canvas document schema (elements, template canvas)
src/lib/actions/            Server actions (auth, patients, templates, assignments)
src/lib/data/                Read-side Supabase queries per role
supabase/migrations/        SQL schema + RLS policies
```

## Notes on the canvas format

Templates store a `TemplateCanvas` JSON document (`{ width, height, background, elements[] }`)
in `templates.canvas`. Each element has an `x/y/w/h` position plus type-specific fields — see
`src/lib/types/canvas.ts`. Assignments freeze a copy of this JSON into
`assignments.canvas_snapshot` at assign time. Scoring logic for the four interactive element
types lives in `src/lib/scoring.ts` and is shared between the player (client-side score
preview) and the submit action (source of truth, stored server-side).
