// Patient-level classification and summary: the caseload-status rule (the
// heart of "which patients need my attention today?") and the activity
// summary that both the analytics page and the printable report render.

import type {
  AnalyticsAttempt,
  PatientActivitySummary,
  PatientStatus,
  StatusDistribution,
  WindowRange,
} from "./types";
import { averageAccuracy, isAccuracyCountable } from "./accuracy";
import { accuracyByDomain, strongestDomain, weakestDomain } from "./domains";
import { isWithin, startOfLocalDay } from "./windows";
import {
  DECLINING_DELTA,
  IMPROVING_DELTA,
  MIN_ATTEMPTS_PER_WINDOW_FOR_IMPROVEMENT,
  NEEDS_ATTENTION_ACCURACY,
} from "./thresholds";

// The single caseload-status rule. Precedence is deliberate:
//
//  1. No activity in the last 7 days  -> inactive. (Covers never-started and
//     gone-quiet alike; re-engagement is the clinician's next action.)
//  2. Low absolute weekly accuracy    -> needs_attention, even if the trend
//     is up — a patient at 45% is struggling regardless of direction.
//  3. A clear week-over-week decline   -> needs_attention.
//  4. A clear week-over-week gain      -> improving.
//  5. Otherwise                        -> steady.
//
// Trend-based branches (3/4) only fire when the patient has enough
// accuracy-countable attempts in both windows to trust the delta; otherwise
// an active patient with adequate accuracy simply reads as steady.
export function classifyStatus(
  attempts: AnalyticsAttempt[],
  thisWeek: WindowRange,
  lastWeek: WindowRange,
): PatientStatus {
  const activeThisWeek = attempts.some((a) => isWithin(thisWeek, a.completedAt));
  if (!activeThisWeek) return "inactive";

  const thisWeekCountable = attempts.filter(
    (a) => isWithin(thisWeek, a.completedAt) && isAccuracyCountable(a),
  );
  const lastWeekCountable = attempts.filter(
    (a) => isWithin(lastWeek, a.completedAt) && isAccuracyCountable(a),
  );

  const thisWeekAccuracy = averageAccuracy(thisWeekCountable);
  if (thisWeekAccuracy !== null && thisWeekAccuracy < NEEDS_ATTENTION_ACCURACY) {
    return "needs_attention";
  }

  const eligibleForTrend =
    thisWeekCountable.length >= MIN_ATTEMPTS_PER_WINDOW_FOR_IMPROVEMENT &&
    lastWeekCountable.length >= MIN_ATTEMPTS_PER_WINDOW_FOR_IMPROVEMENT;

  if (eligibleForTrend) {
    const delta = averageAccuracy(thisWeekCountable)! - averageAccuracy(lastWeekCountable)!;
    if (delta <= -DECLINING_DELTA) return "needs_attention";
    if (delta >= IMPROVING_DELTA) return "improving";
  }

  return "steady";
}

// Empty distribution with every bucket present at 0 — so the UI can render a
// full legend without null-checking each status.
export function emptyStatusDistribution(): StatusDistribution {
  return { improving: 0, steady: 0, needs_attention: 0, inactive: 0 };
}

export function statusDistribution(
  statuses: { patientId: string; status: PatientStatus }[],
): StatusDistribution {
  const dist = emptyStatusDistribution();
  for (const { status } of statuses) dist[status] += 1;
  return dist;
}

function byCompletedAtAsc(a: AnalyticsAttempt, b: AnalyticsAttempt): number {
  return new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime();
}

// The at-a-glance profile of one patient's whole history, plus a this-week /
// last-week accuracy comparison. Domains are computed once here and reused
// for strongest/weakest so nothing recomputes them downstream.
export function buildActivitySummary(
  attempts: AnalyticsAttempt[],
  thisWeek: WindowRange,
  lastWeek: WindowRange,
): PatientActivitySummary {
  const sorted = [...attempts].sort(byCompletedAtAsc);
  const domains = accuracyByDomain(attempts);

  const thisWeekAccuracy = averageAccuracy(
    attempts.filter((a) => isWithin(thisWeek, a.completedAt)),
  );
  const lastWeekAccuracy = averageAccuracy(
    attempts.filter((a) => isWithin(lastWeek, a.completedAt)),
  );

  const activeDays = new Set(
    attempts.map((a) => startOfLocalDay(new Date(a.completedAt)).getTime()),
  ).size;

  return {
    totalCompleted: attempts.length,
    accuracyCountable: attempts.filter(isAccuracyCountable).length,
    averageAccuracy: averageAccuracy(attempts),
    firstActivityAt: sorted[0]?.completedAt ?? null,
    lastActivityAt: sorted[sorted.length - 1]?.completedAt ?? null,
    activeDays,
    thisWeekAccuracy,
    lastWeekAccuracy,
    accuracyDelta:
      thisWeekAccuracy !== null && lastWeekAccuracy !== null
        ? thisWeekAccuracy - lastWeekAccuracy
        : null,
    strongestDomain: strongestDomain(domains),
    weakestDomain: weakestDomain(domains),
  };
}
