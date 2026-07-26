// Accuracy primitives — the single definition of "accuracy" for the whole
// feature (architectural req 4). Everything else (domains, trends, rankings,
// status) builds on these three functions rather than re-deriving percentages.
//
// Convention, decided once here: accuracy comes from correct_count /
// total_count (matching the existing ProgressChart), and attempts with zero
// scorable questions (total_count === 0) are NOT accuracy-countable — they're
// excluded from every average so the old "0 questions => 100%-at-write but
// 0%-at-render" ambiguity can never skew an aggregate. They still count as
// completed activity for volume metrics; they just don't move an accuracy mean.

import type { AnalyticsAttempt } from "./types";

export function isAccuracyCountable(attempt: AnalyticsAttempt): boolean {
  return attempt.totalCount > 0;
}

export function attemptAccuracy(attempt: AnalyticsAttempt): number {
  if (attempt.totalCount <= 0) return 0;
  return Math.round((attempt.correctCount / attempt.totalCount) * 100);
}

// Mean of per-attempt accuracy across accuracy-countable attempts. Each
// activity counts equally (not weighted by how many questions it had),
// matching the product's "average accuracy across activities" framing.
// Returns null — never 0 — when nothing is countable, so callers render an
// explicit "no data" state instead of a misleading zero.
export function averageAccuracy(attempts: AnalyticsAttempt[]): number | null {
  let sum = 0;
  let count = 0;
  for (const attempt of attempts) {
    if (!isAccuracyCountable(attempt)) continue;
    sum += attemptAccuracy(attempt);
    count += 1;
  }
  if (count === 0) return null;
  return Math.round(sum / count);
}
