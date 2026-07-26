// Composition layer. These two thin builders assemble the small, pure
// analytics modules into the finished CaseloadPulse / PatientAnalytics
// models. Everything downstream — the Clinical Pulse dashboard, the
// Performance Analytics page, AND the printable report — renders the output
// of these functions and nothing else (architectural reqs 2 & 3). There is
// no calculation here that isn't just a call into a module above, on purpose.

import type { AnalyticsAttempt, CaseloadPulse, PatientAnalytics } from "./types";
import { averageAccuracy } from "./accuracy";
import { accuracyByDomain } from "./domains";
import { mostActive, mostImproved } from "./rankings";
import { buildActivitySummary, classifyStatus, statusDistribution } from "./summaries";
import { buildTrend } from "./trends";
import { isWithin, rollingWeekWindows } from "./windows";

function groupByPatient(attempts: AnalyticsAttempt[]): Map<string, AnalyticsAttempt[]> {
  const groups = new Map<string, AnalyticsAttempt[]>();
  for (const attempt of attempts) {
    const bucket = groups.get(attempt.patientId);
    if (bucket) bucket.push(attempt);
    else groups.set(attempt.patientId, [attempt]);
  }
  return groups;
}

// The full caseload dashboard model.
//
// `patientIds` is the clinician's active roster, passed in explicitly rather
// than inferred from the attempts, so patients who have never completed
// anything still appear — as "inactive" — instead of silently vanishing from
// the status distribution (the newly-assigned / disengaged edge cases the
// dashboard most needs to surface).
export function buildCaseloadPulse(
  attempts: AnalyticsAttempt[],
  patientIds: string[],
  now: Date = new Date(),
): CaseloadPulse {
  const { thisWeek, lastWeek } = rollingWeekWindows(now);

  const thisWeekAttempts = attempts.filter((a) => isWithin(thisWeek, a.completedAt));
  const lastWeekAttempts = attempts.filter((a) => isWithin(lastWeek, a.completedAt));

  const averageAccuracyThisWeek = averageAccuracy(thisWeekAttempts);
  const averageAccuracyLastWeek = averageAccuracy(lastWeekAttempts);

  const byPatient = groupByPatient(attempts);
  const patientStatuses = patientIds.map((patientId) => ({
    patientId,
    status: classifyStatus(byPatient.get(patientId) ?? [], thisWeek, lastWeek),
  }));

  return {
    generatedAt: now.toISOString(),
    averageAccuracyThisWeek,
    averageAccuracyLastWeek,
    accuracyDelta:
      averageAccuracyThisWeek !== null && averageAccuracyLastWeek !== null
        ? averageAccuracyThisWeek - averageAccuracyLastWeek
        : null,
    // Daily caseload trend across the fetched span — one averaged point per
    // active day, calm enough to read as a line yet responsive to change.
    trend: buildTrend(attempts, "day"),
    mostImproved: mostImproved(attempts, thisWeek, lastWeek),
    mostActive: mostActive(attempts, thisWeek),
    statusDistribution: statusDistribution(patientStatuses),
    patientStatuses,
    activePatientCount: patientIds.length,
  };
}

// The full per-patient analytics model. `attempts` is one patient's complete
// history (chronological order not required — every consumer sorts as needed).
export function buildPatientAnalytics(
  attempts: AnalyticsAttempt[],
  now: Date = new Date(),
): PatientAnalytics {
  const { thisWeek, lastWeek } = rollingWeekWindows(now);

  return {
    generatedAt: now.toISOString(),
    summary: buildActivitySummary(attempts, thisWeek, lastWeek),
    // Attempt-level long-term trend — same granularity the existing
    // ProgressChart already shows; Phase 4 can call buildTrend(…, "week")
    // for a smoothed view without any new aggregation code.
    trend: buildTrend(attempts, "attempt"),
    domains: accuracyByDomain(attempts),
    status: classifyStatus(attempts, thisWeek, lastWeek),
  };
}
