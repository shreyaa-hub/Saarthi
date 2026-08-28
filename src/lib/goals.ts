import type { AnalyticsAttempt } from "@/lib/analytics/types";

// Measuring a goal against the work actually done.
//
// Pure, and separate from the analytics layer it borrows attempts from: a
// goal is a judgement ("are they there yet?") rather than an aggregate, and
// the rule for making that judgement is the thing a clinician has to be able
// to trust. Kept here so it can be tested directly.

export type PatientGoal = {
  id: string;
  patientId: string;
  clinicianId: string;
  title: string;
  domain: string | null;
  targetAccuracy: number;
  windowAttempts: number;
  status: "active" | "achieved" | "archived";
  createdAt: string;
  achievedAt: string | null;
};

export type GoalProgress = {
  /** Accuracy over the counted window, or null when nothing counts yet. */
  accuracy: number | null;
  /** How many attempts went into it. */
  counted: number;
  /** How many the goal asks for before it can be judged. */
  required: number;
  /** True only with a full window at or above target. */
  met: boolean;
  /** Attempts still needed before the goal can be judged at all. */
  remaining: number;
};

// Attempts that count towards one goal: the patient's own, in the goal's
// domain if it names one, that happened after the goal was set.
//
// The date filter is the part that would be easy to leave out and wrong to.
// A goal set today is a statement about what happens next; counting last
// month's work towards it would let a goal be met before it was written.
export function attemptsForGoal(goal: PatientGoal, attempts: AnalyticsAttempt[]): AnalyticsAttempt[] {
  const since = Date.parse(goal.createdAt);
  return attempts.filter((a) => {
    if (a.patientId !== goal.patientId) return false;
    if (goal.domain !== null && a.domain !== goal.domain) return false;
    const at = Date.parse(a.completedAt);
    return Number.isFinite(at) && Number.isFinite(since) ? at >= since : true;
  });
}

// The patient and parent shells read attempts as raw rows with the therapy
// domain joined through assignment -> template, rather than through the
// clinician's normalizing fetcher. This is the one place that projection
// happens for them, so a domain-scoped goal counts the same activities on all
// three screens. Getting this wrong is silent: the goal simply reports
// "nothing counted yet" forever while the clinician sees real progress.
export function toGoalAttempts(
  rows: {
    patient_id: string;
    completed_at: string;
    correct_count: number;
    total_count: number;
    assignments?: { templates?: { domain?: string | null } | null } | null;
  }[],
): AnalyticsAttempt[] {
  return rows.map((r) => ({
    patientId: r.patient_id,
    completedAt: r.completed_at,
    correctCount: r.correct_count,
    totalCount: r.total_count,
    domain: r.assignments?.templates?.domain ?? null,
  }));
}

export function goalProgress(goal: PatientGoal, attempts: AnalyticsAttempt[]): GoalProgress {
  const relevant = attemptsForGoal(goal, attempts)
    .slice()
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
    .slice(0, goal.windowAttempts)
    // An attempt with nothing to mark (a drawing, a story) has no accuracy to
    // contribute and must not dilute the window towards zero.
    .filter((a) => a.totalCount > 0);

  const required = goal.windowAttempts;
  const counted = relevant.length;
  if (counted === 0) {
    return { accuracy: null, counted: 0, required, met: false, remaining: required };
  }

  // Pooled over items rather than averaging per-attempt percentages: a
  // twenty-item activity should weigh more than a two-item one, and averaging
  // percentages would let one tiny perfect activity mask a long poor one.
  const correct = relevant.reduce((sum, a) => sum + a.correctCount, 0);
  const total = relevant.reduce((sum, a) => sum + a.totalCount, 0);
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : null;

  return {
    accuracy,
    counted,
    required,
    // Judged only on a full window. Two attempts at 100% do not retire a goal
    // that asks for five — that is exactly the false positive window_attempts
    // exists to prevent.
    met: counted >= required && accuracy !== null && accuracy >= goal.targetAccuracy,
    remaining: Math.max(0, required - counted),
  };
}
