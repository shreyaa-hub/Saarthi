import { describe, it, expect } from "vitest";
import { rollingWeekWindows, isWithin, startOfLocalDay, addDays, startOfLocalWeek } from "./windows";

describe("rollingWeekWindows", () => {
  const now = new Date(2025, 2, 10, 14, 0, 0); // Mon Mar 10 2025, 2pm local

  it("makes This Week the 7 local days ending today", () => {
    const { thisWeek } = rollingWeekWindows(now);
    expect(thisWeek.start).toEqual(new Date(2025, 2, 4, 0, 0, 0)); // Mar 4 00:00
    expect(thisWeek.end).toEqual(new Date(2025, 2, 11, 0, 0, 0)); // exclusive: Mar 11 00:00
  });

  it("makes Last Week the 7 local days immediately before This Week", () => {
    const { lastWeek, thisWeek } = rollingWeekWindows(now);
    expect(lastWeek.start).toEqual(new Date(2025, 1, 25, 0, 0, 0)); // Feb 25
    expect(lastWeek.end).toEqual(thisWeek.start); // windows tile with no gap/overlap
  });

  it("counts something logged earlier today as within This Week", () => {
    const { thisWeek } = rollingWeekWindows(now);
    expect(isWithin(thisWeek, new Date(2025, 2, 10, 1, 0, 0))).toBe(true);
  });

  it("excludes the boundary instant of the previous window (half-open)", () => {
    const { thisWeek, lastWeek } = rollingWeekWindows(now);
    // The exact tiling boundary belongs to This Week, not Last Week.
    expect(isWithin(lastWeek, thisWeek.start)).toBe(false);
    expect(isWithin(thisWeek, thisWeek.start)).toBe(true);
  });
});

describe("day arithmetic is DST-safe", () => {
  it("addDays lands on the intended calendar day across a spring-forward", () => {
    // 2025-03-09 is US spring-forward; America/New_York loses an hour. Pure
    // ms math would drift, calendar-component math does not.
    const before = new Date(2025, 2, 8, 12, 0, 0);
    const after = addDays(before, 1);
    expect(after.getDate()).toBe(9);
    expect(after.getHours()).toBe(12);
  });

  it("startOfLocalDay zeroes the time components", () => {
    const d = startOfLocalDay(new Date(2025, 2, 10, 23, 59, 59));
    expect(d.getHours()).toBe(0);
    expect(d.getDate()).toBe(10);
  });

  it("startOfLocalWeek is Monday-based", () => {
    // Mar 10 2025 is a Monday -> already the week start.
    expect(startOfLocalWeek(new Date(2025, 2, 10, 9, 0, 0))).toEqual(new Date(2025, 2, 10));
    // Mar 9 2025 is a Sunday -> week starts the preceding Monday, Mar 3.
    expect(startOfLocalWeek(new Date(2025, 2, 9, 9, 0, 0))).toEqual(new Date(2025, 2, 3));
  });
});
