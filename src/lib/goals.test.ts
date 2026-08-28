import { describe, it, expect } from "vitest";
import { goalProgress, attemptsForGoal, type PatientGoal } from "@/lib/goals";
import type { AnalyticsAttempt } from "@/lib/analytics/types";

// A goal is the one place the app tells a clinician "yes, they got there".
// Getting that wrong in either direction is a clinical error, so the rules
// worth pinning down are the ones that decide it: what counts, how much is
// enough, and what happens before there is enough.

const PATIENT = "p1";
const GOAL_SET = "2026-03-01T00:00:00.000Z";

const goal = (over: Partial<PatientGoal> = {}): PatientGoal => ({
  id: "g1",
  patientId: PATIENT,
  clinicianId: "c1",
  title: "80% on /s/ words",
  domain: "Articulation",
  targetAccuracy: 80,
  windowAttempts: 5,
  status: "active",
  createdAt: GOAL_SET,
  achievedAt: null,
  ...over,
});

const attempt = (
  day: number,
  correct: number,
  total: number,
  domain: string | null = "Articulation",
): AnalyticsAttempt => ({
  patientId: PATIENT,
  completedAt: `2026-03-${String(day).padStart(2, "0")}T10:00:00.000Z`,
  correctCount: correct,
  totalCount: total,
  domain,
});

describe("goalProgress", () => {
  it("cannot be met before there are enough attempts to judge", () => {
    // Two perfect activities against a goal asking for five is not success —
    // it is not yet an answer. Reporting "met" here is the false positive the
    // window exists to prevent.
    const p = goalProgress(goal(), [attempt(2, 10, 10), attempt(3, 10, 10)]);
    expect(p.accuracy).toBe(100);
    expect(p.met).toBe(false);
    expect(p.counted).toBe(2);
    expect(p.remaining).toBe(3);
  });

  it("is met on a full window at or above target", () => {
    const attempts = [2, 3, 4, 5, 6].map((d) => attempt(d, 8, 10));
    const p = goalProgress(goal(), attempts);
    expect(p.accuracy).toBe(80);
    expect(p.met).toBe(true);
    expect(p.remaining).toBe(0);
  });

  it("is not met one point below target", () => {
    const attempts = [2, 3, 4, 5, 6].map((d) => attempt(d, 79, 100));
    expect(goalProgress(goal(), attempts).met).toBe(false);
  });

  it("counts only the goal's own domain", () => {
    const attempts = [
      attempt(2, 0, 10, "Language"),
      attempt(3, 0, 10, "Language"),
      ...[4, 5, 6, 7, 8].map((d) => attempt(d, 10, 10)),
    ];
    const p = goalProgress(goal(), attempts);
    // The Language failures are somebody else's problem for this goal.
    expect(p.counted).toBe(5);
    expect(p.accuracy).toBe(100);
    expect(p.met).toBe(true);
  });

  it("counts every domain when the goal names none", () => {
    const attempts = [
      attempt(2, 10, 10, "Language"),
      ...[3, 4, 5, 6].map((d) => attempt(d, 10, 10)),
    ];
    expect(goalProgress(goal({ domain: null }), attempts).counted).toBe(5);
  });

  it("ignores work done before the goal was set", () => {
    // Otherwise a goal could be met the moment it is written, out of history
    // the clinician set it in response to.
    const before = [1, 2, 3, 4, 5].map((d) => ({
      ...attempt(d, 10, 10),
      completedAt: `2026-02-${String(d).padStart(2, "0")}T10:00:00.000Z`,
    }));
    const p = goalProgress(goal(), before);
    expect(p.counted).toBe(0);
    expect(p.accuracy).toBeNull();
    expect(p.met).toBe(false);
  });

  it("uses the most recent window, not the best one", () => {
    // Five perfect activities followed by five poor ones is a patient who has
    // regressed, and the goal must say so.
    const attempts = [
      ...[2, 3, 4, 5, 6].map((d) => attempt(d, 10, 10)),
      ...[7, 8, 9, 10, 11].map((d) => attempt(d, 2, 10)),
    ];
    const p = goalProgress(goal(), attempts);
    expect(p.accuracy).toBe(20);
    expect(p.met).toBe(false);
  });

  it("pools by item rather than averaging percentages", () => {
    // One perfect two-item activity must not cancel a long poor one.
    const attempts = [
      attempt(2, 2, 2),
      attempt(3, 10, 100),
    ];
    const p = goalProgress(goal({ windowAttempts: 2 }), attempts);
    // 12 of 102 items, not the 55% a naive mean of 100% and 10% would give.
    expect(p.accuracy).toBe(12);
  });

  it("does not let an unmarkable activity drag the window to zero", () => {
    // A drawing scores 0 out of 0. Counting it as a zero would punish the
    // patient for doing an activity that has no answer key.
    const attempts = [
      ...[2, 3, 4, 5].map((d) => attempt(d, 10, 10)),
      attempt(6, 0, 0),
    ];
    const p = goalProgress(goal({ windowAttempts: 5 }), attempts);
    expect(p.accuracy).toBe(100);
    expect(p.counted).toBe(4);
    expect(p.met).toBe(false); // still short of a full window, honestly so
  });

  it("reports nothing rather than zero when no attempt counts", () => {
    const p = goalProgress(goal(), []);
    expect(p.accuracy).toBeNull();
    expect(p.met).toBe(false);
    expect(p.remaining).toBe(5);
  });

  it("never counts another patient's work", () => {
    const other = [2, 3, 4, 5, 6].map((d) => ({ ...attempt(d, 10, 10), patientId: "someone-else" }));
    expect(attemptsForGoal(goal(), other)).toEqual([]);
  });
});
