import { describe, it, expect } from "vitest";
import { attemptAccuracy, averageAccuracy, isAccuracyCountable } from "./accuracy";
import type { AnalyticsAttempt } from "./types";

function attempt(correct: number, total: number): AnalyticsAttempt {
  return { patientId: "p1", completedAt: "2025-03-10T10:00:00.000Z", correctCount: correct, totalCount: total, domain: null };
}

describe("attemptAccuracy", () => {
  it("rounds correct/total to a whole percent", () => {
    expect(attemptAccuracy(attempt(3, 4))).toBe(75);
    expect(attemptAccuracy(attempt(1, 3))).toBe(33);
  });

  it("is 0 for a zero-question attempt rather than dividing by zero", () => {
    expect(attemptAccuracy(attempt(0, 0))).toBe(0);
  });
});

describe("isAccuracyCountable", () => {
  it("excludes zero-question attempts", () => {
    expect(isAccuracyCountable(attempt(0, 0))).toBe(false);
    expect(isAccuracyCountable(attempt(2, 5))).toBe(true);
  });
});

describe("averageAccuracy", () => {
  it("returns null (not 0) when there are no countable attempts", () => {
    expect(averageAccuracy([])).toBeNull();
    expect(averageAccuracy([attempt(0, 0), attempt(0, 0)])).toBeNull();
  });

  it("averages per-attempt accuracy, each activity weighted equally", () => {
    // 100% and 50% -> 75, regardless of differing question counts.
    expect(averageAccuracy([attempt(2, 2), attempt(5, 10)])).toBe(75);
  });

  it("ignores zero-question attempts inside a mixed set", () => {
    // The 0/0 attempt must not drag the mean toward zero.
    expect(averageAccuracy([attempt(4, 4), attempt(0, 0)])).toBe(100);
  });
});
