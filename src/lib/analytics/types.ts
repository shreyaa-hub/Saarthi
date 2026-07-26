// Shared analytics data models.
//
// This is the single vocabulary the whole feature speaks: server fetchers
// normalize raw DB rows into `AnalyticsAttempt`, the analytics modules turn
// those into the derived models below, and BOTH the Clinical Pulse /
// Performance Analytics UI and the printable report render those same
// models — never recomputing anything of their own. If a value isn't on one
// of these types, the UI doesn't get to invent it.

// The normalized unit of analysis. One row per completed activity attempt,
// already joined up to its therapy domain by the fetcher. `domain` is null
// when the attempt's template no longer exists (assignments.template_id is
// ON DELETE SET NULL) or never had one — callers bucket null as
// UNCATEGORIZED_DOMAIN, they don't treat it as an error.
export type AnalyticsAttempt = {
  patientId: string;
  completedAt: string; // ISO timestamp
  correctCount: number;
  totalCount: number;
  domain: string | null;
};

// A half-open time range [start, end) — end exclusive so adjacent windows
// (this week / last week) tile with no overlap and no gap.
export type WindowRange = { start: Date; end: Date };

// Per-domain rollup. Deliberately carries BOTH the accuracy and the volume
// so the UI can never present "1 activity @ 100%" as stronger than "50
// activities @ 92%" without the context to judge it (architectural req 5).
// averageAccuracy is null when the domain has no accuracy-countable
// attempts (every attempt had zero scorable questions).
export type DomainStat = {
  domain: string;
  averageAccuracy: number | null;
  completedCount: number;
};

// Granularity for trend aggregation. Only some are surfaced today, but the
// trend builder supports all of them so future "weekly/monthly average"
// views need no refactor (architectural req 6).
export type Granularity = "attempt" | "day" | "week" | "month";

export type TrendPoint = {
  periodStart: string; // ISO; for "attempt" granularity this is the attempt's own completedAt
  averageAccuracy: number | null;
  attemptCount: number;
};

// The four caseload-status buckets. The dashboard answers "which patients
// need my attention today?" by counting patients in each. "stable" (rather
// than "steady") is the product-facing term for an active patient holding
// their level.
export type PatientStatus = "improving" | "stable" | "needs_attention" | "inactive";

// A classification paired with a plain-language explanation of WHY. The
// reason is computed once, in the classifier, so the UI can show something
// actionable ("Average accuracy increased by 18%") without re-deriving any
// of the business logic that produced the status.
export type StatusResult = {
  status: PatientStatus;
  reason: string;
};

export type StatusDistribution = Record<PatientStatus, number>;

export type MostActiveEntry = { patientId: string; attemptCount: number };

// Carries the supporting context a clinician needs to trust the ranking, not
// just the headline delta: how many accuracy-countable attempts backed each
// side of the comparison.
export type MostImprovedEntry = {
  patientId: string;
  thisWeekAccuracy: number;
  lastWeekAccuracy: number;
  delta: number;
  thisWeekAttempts: number;
  lastWeekAttempts: number;
};

export type PatientActivitySummary = {
  totalCompleted: number;
  accuracyCountable: number;
  averageAccuracy: number | null;
  firstActivityAt: string | null;
  lastActivityAt: string | null;
  activeDays: number;
  thisWeekAccuracy: number | null;
  lastWeekAccuracy: number | null;
  accuracyDelta: number | null;
  strongestDomain: DomainStat | null;
  weakestDomain: DomainStat | null;
};

// The composed model powering the entire Clinical Pulse dashboard.
export type CaseloadPulse = {
  generatedAt: string;
  averageAccuracyThisWeek: number | null;
  averageAccuracyLastWeek: number | null;
  accuracyDelta: number | null;
  trend: TrendPoint[];
  mostImproved: MostImprovedEntry[];
  mostActive: MostActiveEntry[];
  statusDistribution: StatusDistribution;
  patientStatuses: (StatusResult & { patientId: string })[];
  activePatientCount: number;
};

// The composed model powering both the Performance Analytics page and the
// printable report — they render this, they do not each derive it.
export type PatientAnalytics = {
  generatedAt: string;
  summary: PatientActivitySummary;
  trend: TrendPoint[];
  domains: DomainStat[];
  status: StatusResult;
};
