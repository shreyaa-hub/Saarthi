// Trend series builder. One function covers every granularity the product
// might surface — attempt-level today, weekly/monthly averages later —
// so a future "smooth to weekly averages" view needs no new aggregation
// code (architectural req 6). Points always come out in chronological order.

import type { AnalyticsAttempt, Granularity, TrendPoint } from "./types";
import { attemptAccuracy, averageAccuracy, isAccuracyCountable } from "./accuracy";
import { startOfLocalDay, startOfLocalMonth, startOfLocalWeek } from "./windows";

function bucketStart(date: Date, granularity: Exclude<Granularity, "attempt">): Date {
  switch (granularity) {
    case "day":
      return startOfLocalDay(date);
    case "week":
      return startOfLocalWeek(date);
    case "month":
      return startOfLocalMonth(date);
  }
}

function byCompletedAtAsc(a: AnalyticsAttempt, b: AnalyticsAttempt): number {
  return new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime();
}

export function buildTrend(
  attempts: AnalyticsAttempt[],
  granularity: Granularity = "attempt",
): TrendPoint[] {
  const sorted = [...attempts].sort(byCompletedAtAsc);

  // Attempt-level: one point per attempt, preserving the existing
  // ProgressChart semantics. A non-countable attempt contributes a null
  // accuracy point (a gap), never a fake 0%.
  if (granularity === "attempt") {
    return sorted.map((attempt) => ({
      periodStart: attempt.completedAt,
      averageAccuracy: isAccuracyCountable(attempt) ? attemptAccuracy(attempt) : null,
      attemptCount: 1,
    }));
  }

  // Bucketed: group into day/week/month, average within each bucket.
  // Insertion order tracked separately so output stays chronological
  // (Map preserves it, but being explicit keeps intent obvious).
  const buckets = new Map<number, AnalyticsAttempt[]>();
  const order: number[] = [];
  for (const attempt of sorted) {
    const key = bucketStart(new Date(attempt.completedAt), granularity).getTime();
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.push(attempt);
    } else {
      buckets.set(key, [attempt]);
      order.push(key);
    }
  }

  return order.map((key) => {
    const group = buckets.get(key)!;
    return {
      periodStart: new Date(key).toISOString(),
      averageAccuracy: averageAccuracy(group),
      attemptCount: group.length,
    };
  });
}
