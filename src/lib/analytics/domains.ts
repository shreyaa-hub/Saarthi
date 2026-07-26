// Per-therapy-domain aggregation (Articulation, Language, Fluency, …).
// Domain is resolved by the fetcher via attempt → assignment → template;
// a null domain (deleted template) buckets under UNCATEGORIZED_DOMAIN.

import type { AnalyticsAttempt, DomainStat } from "./types";
import { averageAccuracy } from "./accuracy";
import { MIN_DOMAIN_ATTEMPTS_FOR_SIGNAL, UNCATEGORIZED_DOMAIN } from "./thresholds";

export function domainOf(attempt: AnalyticsAttempt): string {
  return attempt.domain ?? UNCATEGORIZED_DOMAIN;
}

// Every domain the patient has practiced, each carrying accuracy AND volume.
// Default order is most-practiced first, then higher accuracy, then name —
// so the list reads as "where the patient spends their effort", and a
// high-accuracy/low-volume domain never floats to the top on accuracy alone.
export function accuracyByDomain(attempts: AnalyticsAttempt[]): DomainStat[] {
  const groups = new Map<string, AnalyticsAttempt[]>();
  for (const attempt of attempts) {
    const key = domainOf(attempt);
    const bucket = groups.get(key);
    if (bucket) bucket.push(attempt);
    else groups.set(key, [attempt]);
  }

  const stats: DomainStat[] = [];
  for (const [domain, group] of groups) {
    stats.push({
      domain,
      averageAccuracy: averageAccuracy(group),
      completedCount: group.length,
    });
  }

  stats.sort(
    (a, b) =>
      b.completedCount - a.completedCount ||
      (b.averageAccuracy ?? -1) - (a.averageAccuracy ?? -1) ||
      a.domain.localeCompare(b.domain),
  );
  return stats;
}

// Domains with enough volume to be a real signal (guards against "1 activity
// @ 100%" being announced as a strength). Uncategorized is never a
// clinically meaningful strength/weakness, so it's excluded from these two.
function signalDomains(stats: DomainStat[]): DomainStat[] {
  return stats.filter(
    (s) =>
      s.domain !== UNCATEGORIZED_DOMAIN &&
      s.averageAccuracy !== null &&
      s.completedCount >= MIN_DOMAIN_ATTEMPTS_FOR_SIGNAL,
  );
}

export function strongestDomain(stats: DomainStat[]): DomainStat | null {
  const eligible = signalDomains(stats);
  if (eligible.length === 0) return null;
  return eligible.reduce((best, s) =>
    (s.averageAccuracy ?? 0) > (best.averageAccuracy ?? 0) ? s : best,
  );
}

export function weakestDomain(stats: DomainStat[]): DomainStat | null {
  const eligible = signalDomains(stats);
  if (eligible.length === 0) return null;
  return eligible.reduce((worst, s) =>
    (s.averageAccuracy ?? 100) < (worst.averageAccuracy ?? 100) ? s : worst,
  );
}
