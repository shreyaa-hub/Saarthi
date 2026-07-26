import { describe, it, expect } from "vitest";
import { buildTrend } from "./trends";
import type { AnalyticsAttempt } from "./types";

function at(date: Date, correct: number, total: number): AnalyticsAttempt {
  return { patientId: "p1", completedAt: date.toISOString(), correctCount: correct, totalCount: total, domain: null };
}

describe("buildTrend", () => {
  it("attempt granularity: one chronological point per attempt", () => {
    const points = buildTrend(
      [
        at(new Date(2025, 2, 10, 9, 0, 0), 9, 10),
        at(new Date(2025, 2, 8, 9, 0, 0), 5, 10), // earlier -> should sort first
      ],
      "attempt",
    );
    expect(points.map((p) => p.averageAccuracy)).toEqual([50, 90]);
    expect(points.every((p) => p.attemptCount === 1)).toBe(true);
  });

  it("attempt granularity: a zero-question attempt is a null gap, not a fake 0%", () => {
    const points = buildTrend([at(new Date(2025, 2, 10, 9, 0, 0), 0, 0)], "attempt");
    expect(points[0].averageAccuracy).toBeNull();
  });

  it("day granularity: averages attempts sharing a local day into one point", () => {
    const points = buildTrend(
      [
        at(new Date(2025, 2, 10, 9, 0, 0), 6, 10), // 60
        at(new Date(2025, 2, 10, 18, 0, 0), 10, 10), // 100, same day
        at(new Date(2025, 2, 11, 9, 0, 0), 8, 10), // 80, next day
      ],
      "day",
    );
    expect(points).toHaveLength(2);
    expect(points[0].averageAccuracy).toBe(80); // (60 + 100) / 2
    expect(points[0].attemptCount).toBe(2);
    expect(points[1].averageAccuracy).toBe(80);
  });

  it("returns an empty series for no attempts", () => {
    expect(buildTrend([], "day")).toEqual([]);
  });
});
