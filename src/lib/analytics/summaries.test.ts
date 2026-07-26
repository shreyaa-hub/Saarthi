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
  it("is 'inactive' with no attempts in the last 7 days", () => {
    expect(classifyStatus([], thisWeek, lastWeek)).toBe("inactive");
    expect(classifyStatus([at(inLastWeek, 9, 10)], thisWeek, lastWeek)).toBe("inactive");
  });

  it("is 'needs_attention' when weekly accuracy is below threshold, even while improving", () => {
    const attempts = [
      at(inLastWeek, 2, 10), at(inLastWeek, 2, 10), // last avg 20
      at(inThisWeek, 5, 10), at(inThisWeek, 5, 10), // this avg 50 (up, but still < 60)
    ];
    expect(classifyStatus(attempts, thisWeek, lastWeek)).toBe("needs_attention");
  });

  it("is 'needs_attention' on a clear week-over-week decline", () => {
    const attempts = [
      at(inLastWeek, 10, 10), at(inLastWeek, 10, 10), // 100
      at(inThisWeek, 8, 10), at(inThisWeek, 8, 10), // 80 -> -20
    ];
    expect(classifyStatus(attempts, thisWeek, lastWeek)).toBe("needs_attention");
  });

  it("is 'improving' on a clear gain with adequate accuracy", () => {
    const attempts = [
      at(inLastWeek, 7, 10), at(inLastWeek, 7, 10), // 70
      at(inThisWeek, 9, 10), at(inThisWeek, 9, 10), // 90 -> +20
    ];
    expect(classifyStatus(attempts, thisWeek, lastWeek)).toBe("improving");
  });

  it("is 'steady' when active with adequate accuracy and no strong trend signal", () => {
    const attempts = [
      at(inLastWeek, 8, 10), at(inLastWeek, 8, 10), // 80
      at(inThisWeek, 8, 10), at(inThisWeek, 8, 10), // 80 -> 0
    ];
    expect(classifyStatus(attempts, thisWeek, lastWeek)).toBe("steady");
  });

  it("is 'steady' (not improving) when active but ineligible for a trend read", () => {
    // Only one countable attempt this week -> can't trust a delta; adequate accuracy.
    expect(classifyStatus([at(inThisWeek, 9, 10)], thisWeek, lastWeek)).toBe("steady");
  });
});

describe("statusDistribution", () => {
  it("counts every bucket and always includes all four keys", () => {
    const statuses: { patientId: string; status: PatientStatus }[] = [
      { patientId: "a", status: "improving" },
      { patientId: "b", status: "improving" },
      { patientId: "c", status: "inactive" },
    ];
    expect(statusDistribution(statuses)).toEqual({ improving: 2, steady: 0, needs_attention: 0, inactive: 1 });
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
