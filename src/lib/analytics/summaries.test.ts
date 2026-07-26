import { describe, it, expect } from "vitest";
import { buildActivitySummary, classifyStatus, statusDistribution } from "./summaries";
import { rollingWeekWindows } from "./windows";
import type { AnalyticsAttempt, PatientStatus } from "./types";

const NOW = new Date(2025, 2, 10, 12, 0, 0); // Mon Mar 10 2025
const { thisWeek, lastWeek } = rollingWeekWindows(NOW);

function at(date: Date, correct: number, total: number, domain: string | null = "Language"): AnalyticsAttempt {
  return { patientId: "p1", completedAt: date.toISOString(), correctCount: correct, totalCount: total, domain };
}
const inThisWeek = new Date(2025, 2, 9, 10, 0, 0);
const inLastWeek = new Date(2025, 2, 2, 10, 0, 0);

describe("classifyStatus", () => {
  it("is 'inactive' with no attempts in the last 7 days, with an explaining reason", () => {
    const result = classifyStatus([], thisWeek, lastWeek);
    expect(result.status).toBe("inactive");
    expect(result.reason).toMatch(/last 7 days/i);
    expect(classifyStatus([at(inLastWeek, 9, 10)], thisWeek, lastWeek).status).toBe("inactive");
  });

  it("is 'needs_attention' when weekly accuracy is below threshold, even while improving", () => {
    const attempts = [
      at(inLastWeek, 2, 10), at(inLastWeek, 2, 10), // last avg 20
      at(inThisWeek, 5, 10), at(inThisWeek, 5, 10), // this avg 50 (up, but still < 60)
    ];
    const result = classifyStatus(attempts, thisWeek, lastWeek);
    expect(result.status).toBe("needs_attention");
    expect(result.reason).toMatch(/below/i);
  });

  it("is 'needs_attention' on a clear week-over-week decline, and says so", () => {
    const attempts = [
      at(inLastWeek, 10, 10), at(inLastWeek, 10, 10), // 100
      at(inThisWeek, 8, 10), at(inThisWeek, 8, 10), // 80 -> -20
    ];
    const result = classifyStatus(attempts, thisWeek, lastWeek);
    expect(result.status).toBe("needs_attention");
    expect(result.reason).toMatch(/declined by 20%/i);
  });

  it("is 'improving' on a clear gain, and reports the increase", () => {
    const attempts = [
      at(inLastWeek, 7, 10), at(inLastWeek, 7, 10), // 70
      at(inThisWeek, 9, 10), at(inThisWeek, 9, 10), // 90 -> +20
    ];
    const result = classifyStatus(attempts, thisWeek, lastWeek);
    expect(result.status).toBe("improving");
    expect(result.reason).toMatch(/increased by 20%/i);
  });

  it("is 'stable' when active with adequate accuracy and no strong trend signal", () => {
    const attempts = [
      at(inLastWeek, 8, 10), at(inLastWeek, 8, 10), // 80
      at(inThisWeek, 8, 10), at(inThisWeek, 8, 10), // 80 -> 0
    ];
    expect(classifyStatus(attempts, thisWeek, lastWeek).status).toBe("stable");
  });

  it("is 'stable' (not improving) when active but ineligible for a trend read", () => {
    // Only one countable attempt this week -> can't trust a delta; adequate accuracy.
    expect(classifyStatus([at(inThisWeek, 9, 10)], thisWeek, lastWeek).status).toBe("stable");
  });
});

describe("statusDistribution", () => {
  it("counts every bucket and always includes all four keys", () => {
    const statuses: { patientId: string; status: PatientStatus }[] = [
      { patientId: "a", status: "improving" },
      { patientId: "b", status: "improving" },
      { patientId: "c", status: "inactive" },
    ];
    expect(statusDistribution(statuses)).toEqual({ improving: 2, stable: 0, needs_attention: 0, inactive: 1 });
  });
});

describe("buildActivitySummary", () => {
  it("summarizes totals, active days, and this/last-week comparison", () => {
    const attempts = [
      at(inLastWeek, 6, 10),
      at(inThisWeek, 8, 10),
      at(new Date(2025, 2, 9, 15, 0, 0), 10, 10), // same day as inThisWeek -> one active day
    ];
    const summary = buildActivitySummary(attempts, thisWeek, lastWeek);
    expect(summary.totalCompleted).toBe(3);
    expect(summary.activeDays).toBe(2); // Mar 2 and Mar 9
    expect(summary.lastWeekAccuracy).toBe(60);
    expect(summary.thisWeekAccuracy).toBe(90); // (80 + 100) / 2
    expect(summary.accuracyDelta).toBe(30);
  });

  it("reports null accuracy fields for an empty history rather than zeros", () => {
    const summary = buildActivitySummary([], thisWeek, lastWeek);
    expect(summary.totalCompleted).toBe(0);
    expect(summary.averageAccuracy).toBeNull();
    expect(summary.firstActivityAt).toBeNull();
    expect(summary.strongestDomain).toBeNull();
  });
});
