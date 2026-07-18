import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  formatListTimestamp,
  formatDateSeparator,
  formatBubbleTimestamp,
  msUntilListTimestampGraduates,
  isSameLocalDay,
} from "./format";

const LOCALE = "en-US";

describe("formatListTimestamp", () => {
  it("shows 'Just now' for anything under 60s old", () => {
    const now = new Date(2025, 2, 10, 14, 0, 0);
    const date = new Date(2025, 2, 10, 13, 59, 5);
    expect(formatListTimestamp(date, now, LOCALE).label).toBe("Just now");
  });

  it("clamps a future timestamp (device clock skew) to 'Just now' rather than a negative duration", () => {
    const now = new Date(2025, 2, 10, 14, 0, 0);
    const date = new Date(2025, 2, 10, 14, 5, 0); // 5 minutes "in the future"
    expect(formatListTimestamp(date, now, LOCALE).label).toBe("Just now");
  });

  it("switches to clock time once past 60s, for the same local day", () => {
    const now = new Date(2025, 2, 10, 14, 5, 0);
    const date = new Date(2025, 2, 10, 10, 42, 0);
    const { label } = formatListTimestamp(date, now, LOCALE);
    expect(label).toMatch(/10:42/);
    expect(label).not.toBe("Just now");
  });

  // The exact bug class the design explicitly guards against: bucketing
  // by elapsed hours (or days = round(hours / 24)) instead of true
  // local-calendar-day boundaries. A message from 11:58pm has only ~4
  // minutes of elapsed time by the time it's viewed at 12:02am the next
  // day, but it must say "Yesterday", not "Just now" or a same-day clock
  // time.
  it("says 'Yesterday' based on the calendar-day boundary, not elapsed minutes", () => {
    const date = new Date(2025, 2, 10, 23, 58, 0);
    const now = new Date(2025, 2, 11, 0, 2, 0); // 4 minutes later, next calendar day
    expect(formatListTimestamp(date, now, LOCALE).label).toBe("Yesterday");
  });

  it("does NOT say 'Yesterday' for something 20 hours old but still today", () => {
    // Elapsed-hours bucketing (hours >= some threshold) would get this
    // wrong in the other direction if it existed; calendar-day comparison
    // correctly keeps this "today" since both instants share a local day.
    const date = new Date(2025, 2, 10, 0, 5, 0);
    const now = new Date(2025, 2, 10, 20, 5, 0);
    const { label } = formatListTimestamp(date, now, LOCALE);
    expect(label).not.toBe("Yesterday");
    expect(label).toMatch(/12:05/);
  });

  it("uses a weekday name for 2-6 days back", () => {
    // 2025-03-10 is a Monday; 3 days earlier is Friday 2025-03-07.
    const date = new Date(2025, 2, 7, 9, 0, 0);
    const now = new Date(2025, 2, 10, 9, 0, 0);
    expect(formatListTimestamp(date, now, LOCALE).label).toBe("Friday");
  });

  it("uses a short date with no year for 7+ days back in the same calendar year", () => {
    const date = new Date(2025, 0, 1, 9, 0, 0);
    const now = new Date(2025, 2, 10, 9, 0, 0);
    const { label } = formatListTimestamp(date, now, LOCALE);
    expect(label).toBe("Jan 1");
  });

  it("includes the year once the date is in a different calendar year than now", () => {
    const date = new Date(2023, 11, 25, 9, 0, 0);
    const now = new Date(2025, 2, 10, 9, 0, 0);
    const { label } = formatListTimestamp(date, now, LOCALE);
    expect(label).toBe("Dec 25, 2023");
  });

  it("always returns a full-precision string distinct from the abbreviated label", () => {
    const now = new Date(2025, 2, 10, 14, 5, 0);
    const date = new Date(2025, 2, 7, 10, 42, 0);
    const result = formatListTimestamp(date, now, LOCALE);
    expect(result.fullPrecision).toContain("2025");
    expect(result.fullPrecision).toContain("Friday");
  });
});

describe("formatDateSeparator", () => {
  it("labels the same local day as 'Today'", () => {
    const now = new Date(2025, 2, 10, 20, 0, 0);
    const date = new Date(2025, 2, 10, 8, 0, 0);
    expect(formatDateSeparator(date, now, LOCALE).label).toBe("Today");
  });

  it("labels the previous local day as 'Yesterday' regardless of elapsed hours", () => {
    const now = new Date(2025, 2, 11, 0, 2, 0);
    const date = new Date(2025, 2, 10, 23, 58, 0);
    expect(formatDateSeparator(date, now, LOCALE).label).toBe("Yesterday");
  });

  it("gives a date-only iso (no time component) for <time dateTime>", () => {
    const date = new Date(2025, 2, 7, 10, 42, 0);
    const { iso } = formatDateSeparator(date, new Date(2025, 2, 10), LOCALE);
    expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("formatBubbleTimestamp", () => {
  it("is always absolute clock time and never depends on the current time", () => {
    const date = new Date(2025, 2, 10, 10, 42, 0);
    const { label } = formatBubbleTimestamp(date, LOCALE);
    expect(label).toMatch(/10:42/);
  });
});

describe("msUntilListTimestampGraduates", () => {
  it("returns the remaining ms until the 60s mark for a fresh timestamp", () => {
    const now = new Date(2025, 2, 10, 14, 0, 0);
    const date = new Date(2025, 2, 10, 13, 59, 45); // 15s old
    expect(msUntilListTimestampGraduates(date, now)).toBe(45_000);
  });

  it("returns null once a timestamp is already past 60s old — no timer needed", () => {
    const now = new Date(2025, 2, 10, 14, 0, 0);
    const date = new Date(2025, 2, 10, 13, 58, 0); // 2 minutes old
    expect(msUntilListTimestampGraduates(date, now)).toBeNull();
  });

  it("schedules correctly even for a clock-skewed 'future' timestamp", () => {
    const now = new Date(2025, 2, 10, 14, 0, 0);
    const date = new Date(2025, 2, 10, 14, 0, 5); // 5s "in the future"
    // Must wait until true elapsed time (from `date`) reaches 60s, i.e.
    // 65s from `now`, not 55s.
    expect(msUntilListTimestampGraduates(date, now)).toBe(65_000);
  });
});

describe("DST safety", () => {
  // 2025-03-09 is the US spring-forward transition (America/New_York) —
  // that local day is only 23 wall-clock hours long. Calendar-day
  // comparison must still correctly treat the day before and the day
  // after as adjacent days, without drifting due to the missing hour.
  const originalTz = process.env.TZ;
  beforeAll(() => {
    process.env.TZ = "America/New_York";
  });
  afterAll(() => {
    process.env.TZ = originalTz;
  });

  it("correctly identifies adjacent calendar days spanning a spring-forward transition", () => {
    const beforeTransition = new Date(2025, 2, 8, 22, 0, 0); // Mar 8, 10pm
    const afterTransition = new Date(2025, 2, 9, 22, 0, 0); // Mar 9, 10pm (post-transition)
    expect(isSameLocalDay(beforeTransition, afterTransition)).toBe(false);
    expect(formatDateSeparator(beforeTransition, afterTransition, LOCALE).label).toBe("Yesterday");
  });

  it("correctly identifies the same calendar day on the transition day itself", () => {
    const morning = new Date(2025, 2, 9, 1, 0, 0); // before the 2am jump
    const evening = new Date(2025, 2, 9, 22, 0, 0); // after it
    expect(isSameLocalDay(morning, evening)).toBe(true);
  });
});
