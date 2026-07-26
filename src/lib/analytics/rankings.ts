// Caseload rankings: Most Active and Most Improved. Both take pre-fetched
// caseload attempts plus the comparison windows — no fetching here, pure
// aggregation.

import type {
  AnalyticsAttempt,
  MostActiveEntry,
  MostImprovedEntry,
  WindowRange,
} from "./types";
import { averageAccuracy, isAccuracyCountable } from "./accuracy";
import { isWithin } from "./windows";
import { DEFAULT_RANKING_LIMIT, MIN_ATTEMPTS_PER_WINDOW_FOR_IMPROVEMENT } from "./thresholds";

function groupByPatient(attempts: AnalyticsAttempt[]): Map<string, AnalyticsAttempt[]> {
  const groups = new Map<string, AnalyticsAttempt[]>();
  for (const attempt of attempts) {
    const bucket = groups.get(attempt.patientId);
    if (bucket) bucket.push(attempt);
    else groups.set(attempt.patientId, [attempt]);
  }
  return groups;
}

// Who's engaging most right now: raw count of completed attempts inside the
// window (every completed activity counts, including zero-question ones —
// this measures engagement, not accuracy). Ties break by patientId so the
// ordering is stable across renders.
export function mostActive(
  attempts: AnalyticsAttempt[],
  window: WindowRange,
  limit: number = DEFAULT_RANKING_LIMIT,
): MostActiveEntry[] {
  const counts = new Map<string, number>();
  for (const attempt of attempts) {
    if (!isWithin(window, attempt.completedAt)) continue;
    counts.set(attempt.patientId, (counts.get(attempt.patientId) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([patientId, attemptCount]) => ({ patientId, attemptCount }))
    .sort((a, b) => b.attemptCount - a.attemptCount || a.patientId.localeCompare(b.patientId))
    .slice(0, limit);
}

// Biggest week-over-week accuracy gain. A patient only qualifies with enough
// accuracy-countable attempts in BOTH windows (architectural req 7) — so a
// single strong attempt can't manufacture "improvement". Only genuine gains
// (delta > 0) are returned; if nobody improved, the list is empty and the UI
// shows its empty state rather than dressing up a decline as "most improved".
export function mostImproved(
  attempts: AnalyticsAttempt[],
  thisWeek: WindowRange,
  lastWeek: WindowRange,
  limit: number = DEFAULT_RANKING_LIMIT,
): MostImprovedEntry[] {
  const byPatient = groupByPatient(attempts);
  const entries: MostImprovedEntry[] = [];

  for (const [patientId, patientAttempts] of byPatient) {
    const thisWeekCountable = patientAttempts.filter(
      (a) => isWithin(thisWeek, a.completedAt) && isAccuracyCountable(a),
    );
    const lastWeekCountable = patientAttempts.filter(
      (a) => isWithin(lastWeek, a.completedAt) && isAccuracyCountable(a),
    );

    if (
      thisWeekCountable.length < MIN_ATTEMPTS_PER_WINDOW_FOR_IMPROVEMENT ||
      lastWeekCountable.length < MIN_ATTEMPTS_PER_WINDOW_FOR_IMPROVEMENT
    ) {
      continue;
    }

    // Non-null: both windows have >= MIN countable attempts by the guard above.
    const thisWeekAccuracy = averageAccuracy(thisWeekCountable)!;
    const lastWeekAccuracy = averageAccuracy(lastWeekCountable)!;
    const delta = thisWeekAccuracy - lastWeekAccuracy;
    if (delta <= 0) continue;

    entries.push({ patientId, thisWeekAccuracy, lastWeekAccuracy, delta });
  }

  entries.sort((a, b) => b.delta - a.delta || a.patientId.localeCompare(b.patientId));
  return entries.slice(0, limit);
}
