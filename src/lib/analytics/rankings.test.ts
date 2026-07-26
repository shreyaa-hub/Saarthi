import { describe, it, expect } from "vitest";
import { mostActive, mostImproved } from "./rankings";
import { rollingWeekWindows } from "./windows";
import type { AnalyticsAttempt } from "./types";

const NOW = new Date(2025, 2, 10, 12, 0, 0); // Mon Mar 10 2025
const { thisWeek, lastWeek } = rollingWeekWindows(NOW);

// Helpers that place an attempt squarely inside a given window.
function thisWeekAttempt(patientId: string, correct: number, total: number): AnalyticsAttempt {
  return { patientId, completedAt: new Date(2025, 2, 9, 10, 0, 0).toISOString(), correctCount: correct, totalCount: total, domain: null };
}
function lastWeekAttempt(patientId: string, correct: number, total: number): AnalyticsAttempt {
  return { patientId, completedAt: new Date(2025, 2, 2, 10, 0, 0).toISOString(), correctCount: correct, totalCount: total, domain: null };
}

describe("mostActive", () => {
  it("ranks patients by completed-attempt count within This Week", () => {
    const ranked = mostActive(
      [
        thisWeekAttempt("a", 1, 2),
        thisWeekAttempt("a", 1, 2),
        thisWeekAttempt("a", 1, 2),
        thisWeekAttempt("b", 1, 2),
        lastWeekAttempt("b", 1, 2), // outside window, ignored
      ],
      thisWeek,
    );
    expect(ranked[0]).toEqual({ patientId: "a", attemptCount: 3 });
    expect(ranked[1]).toEqual({ patientId: "b", attemptCount: 1 });
  });

  it("counts zero-question attempts as activity (engagement, not accuracy)", () => {
    const ranked = mostActive([thisWeekAttempt("a", 0, 0)], thisWeek);
    expect(ranked[0].attemptCount).toBe(1);
  });
});

describe("mostImproved", () => {
  it("requires the minimum attempts in BOTH windows before ranking a patient", () => {
    // Patient "solo" has only one attempt per window -> ineligible despite a big jump.
    const ranked = mostImproved(
      [
        lastWeekAttempt("solo", 1, 10), // 10%
        thisWeekAttempt("solo", 10, 10), // 100%
      ],
      thisWeek,
      lastWeek,
    );
    expect(ranked).toHaveLength(0);
  });

  it("ranks eligible patients by week-over-week accuracy gain", () => {
    const ranked = mostImproved(
      [
        // eligible: 2 countable attempts each window, +40 pts
        lastWeekAttempt("big", 5, 10),
        lastWeekAttempt("big", 5, 10), // last avg 50
        thisWeekAttempt("big", 9, 10),
        thisWeekAttempt("big", 9, 10), // this avg 90 -> +40
        // eligible: +10 pts
        lastWeekAttempt("small", 7, 10),
        lastWeekAttempt("small", 7, 10), // 70
        thisWeekAttempt("small", 8, 10),
        thisWeekAttempt("small", 8, 10), // 80 -> +10
      ],
      thisWeek,
      lastWeek,
    );
    expect(ranked.map((e) => e.patientId)).toEqual(["big", "small"]);
    expect(ranked[0].delta).toBe(40);
  });

  it("omits patients who did not improve (delta <= 0)", () => {
    const ranked = mostImproved(
      [
        lastWeekAttempt("down", 9, 10),
        lastWeekAttempt("down", 9, 10), // 90
        thisWeekAttempt("down", 6, 10),
        thisWeekAttempt("down", 6, 10), // 60 -> -30
      ],
      thisWeek,
      lastWeek,
    );
    expect(ranked).toHaveLength(0);
  });
});
