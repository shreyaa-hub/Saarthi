import { describe, it, expect } from "vitest";
import { buildCaseloadPulse, buildPatientAnalytics } from "./models";
import type { AnalyticsAttempt } from "./types";

const NOW = new Date(2025, 2, 10, 12, 0, 0); // Mon Mar 10 2025
const inThisWeek = new Date(2025, 2, 9, 10, 0, 0);
const inLastWeek = new Date(2025, 2, 2, 10, 0, 0);

function at(patientId: string, date: Date, correct: number, total: number, domain: string | null = "Language"): AnalyticsAttempt {
  return { patientId, completedAt: date.toISOString(), correctCount: correct, totalCount: total, domain };
}

describe("buildCaseloadPulse", () => {
  it("includes roster patients with zero attempts as 'inactive' rather than dropping them", () => {
    const attempts = [at("active", inThisWeek, 8, 10)];
    const pulse = buildCaseloadPulse(attempts, ["active", "never-started"], NOW);
    expect(pulse.activePatientCount).toBe(2);
    expect(pulse.statusDistribution.inactive).toBe(1);
    const neverStarted = pulse.patientStatuses.find((p) => p.patientId === "never-started");
    expect(neverStarted?.status).toBe("inactive");
    expect(neverStarted?.reason).toMatch(/last 7 days/i); // reason travels with the status
  });

  it("computes this-week vs last-week caseload accuracy and the delta", () => {
    const attempts = [
      at("a", inLastWeek, 6, 10), // last: 60
      at("b", inThisWeek, 9, 10), // this: 90
    ];
    const pulse = buildCaseloadPulse(attempts, ["a", "b"], NOW);
    expect(pulse.averageAccuracyLastWeek).toBe(60);
    expect(pulse.averageAccuracyThisWeek).toBe(90);
    expect(pulse.accuracyDelta).toBe(30);
  });

  it("leaves accuracy fields null (delta null) when a window has no data", () => {
    const pulse = buildCaseloadPulse([at("a", inThisWeek, 9, 10)], ["a"], NOW);
    expect(pulse.averageAccuracyThisWeek).toBe(90);
    expect(pulse.averageAccuracyLastWeek).toBeNull();
    expect(pulse.accuracyDelta).toBeNull();
  });

  it("produces an empty-but-valid model for a caseload with no patients", () => {
    const pulse = buildCaseloadPulse([], [], NOW);
    expect(pulse.activePatientCount).toBe(0);
    expect(pulse.mostActive).toEqual([]);
    expect(pulse.mostImproved).toEqual([]);
    expect(pulse.statusDistribution).toEqual({ improving: 0, stable: 0, needs_attention: 0, inactive: 0 });
  });
});

describe("buildPatientAnalytics", () => {
  it("assembles summary, trend, domains, and status from one history", () => {
    const attempts = [
      at("p1", inLastWeek, 7, 10, "Articulation"),
      at("p1", inLastWeek, 7, 10, "Articulation"),
      at("p1", inThisWeek, 9, 10, "Articulation"),
      at("p1", inThisWeek, 9, 10, "Fluency"),
    ];
    const model = buildPatientAnalytics(attempts, NOW);
    expect(model.trend).toHaveLength(4); // attempt-level
    expect(model.domains.map((d) => d.domain)).toContain("Articulation");
    expect(model.summary.totalCompleted).toBe(4);
    expect(model.status.status).toBe("improving"); // 70 -> 90
    expect(model.status.reason).toMatch(/increased/i);
  });

  it("is safe and empty for a patient with no attempts", () => {
    const model = buildPatientAnalytics([], NOW);
    expect(model.trend).toEqual([]);
    expect(model.domains).toEqual([]);
    expect(model.summary.averageAccuracy).toBeNull();
    expect(model.status.status).toBe("inactive");
  });
});
