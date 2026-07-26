import { describe, it, expect } from "vitest";
import { accuracyByDomain, strongestDomain, weakestDomain } from "./domains";
import { UNCATEGORIZED_DOMAIN } from "./thresholds";
import type { AnalyticsAttempt } from "./types";

function attempt(domain: string | null, correct: number, total: number): AnalyticsAttempt {
  return { patientId: "p1", completedAt: "2025-03-10T10:00:00.000Z", correctCount: correct, totalCount: total, domain };
}

describe("accuracyByDomain", () => {
  it("groups by domain and reports accuracy AND volume for each", () => {
    const stats = accuracyByDomain([
      attempt("Articulation", 8, 10),
      attempt("Articulation", 9, 10),
      attempt("Fluency", 5, 10),
    ]);
    const artic = stats.find((s) => s.domain === "Articulation")!;
    expect(artic.completedCount).toBe(2);
    expect(artic.averageAccuracy).toBe(85);
    const fluency = stats.find((s) => s.domain === "Fluency")!;
    expect(fluency.completedCount).toBe(1);
    expect(fluency.averageAccuracy).toBe(50);
  });

  it("buckets a null domain (deleted template) under Uncategorized", () => {
    const stats = accuracyByDomain([attempt(null, 3, 4)]);
    expect(stats).toHaveLength(1);
    expect(stats[0].domain).toBe(UNCATEGORIZED_DOMAIN);
  });

  it("orders most-practiced first so a high-accuracy/low-volume domain can't lead on accuracy alone", () => {
    const stats = accuracyByDomain([
      attempt("Language", 10, 10), // 1 attempt @ 100%
      attempt("Articulation", 9, 10),
      attempt("Articulation", 9, 10),
      attempt("Articulation", 9, 10), // 3 attempts @ 90%
    ]);
    expect(stats[0].domain).toBe("Articulation");
  });
});

describe("strongest / weakest domain", () => {
  it("ignores domains below the minimum-volume signal threshold", () => {
    // Language has a single perfect attempt (< 3) and must not be named the strength.
    const stats = accuracyByDomain([
      attempt("Language", 10, 10),
      attempt("Articulation", 8, 10),
      attempt("Articulation", 8, 10),
      attempt("Articulation", 8, 10),
    ]);
    expect(strongestDomain(stats)?.domain).toBe("Articulation");
  });

  it("returns null when no domain has enough volume to be a signal", () => {
    const stats = accuracyByDomain([attempt("Fluency", 5, 10)]);
    expect(strongestDomain(stats)).toBeNull();
    expect(weakestDomain(stats)).toBeNull();
  });

  it("never treats Uncategorized as a strength or weakness", () => {
    const stats = accuracyByDomain([
      attempt(null, 10, 10),
      attempt(null, 10, 10),
      attempt(null, 10, 10),
    ]);
    expect(strongestDomain(stats)).toBeNull();
  });
});
