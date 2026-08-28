import { describe, it, expect } from "vitest";
import { repeatDueDates } from "@/lib/assignment-schedule";

describe("repeatDueDates", () => {
  it("spaces a week of daily practice out one day at a time", () => {
    expect(repeatDueDates("2026-03-02", 5, 1)).toEqual([
      "2026-03-02",
      "2026-03-03",
      "2026-03-04",
      "2026-03-05",
      "2026-03-06",
    ]);
  });

  it("honours a longer interval", () => {
    expect(repeatDueDates("2026-03-02", 3, 7)).toEqual([
      "2026-03-02",
      "2026-03-09",
      "2026-03-16",
    ]);
  });

  it("crosses a month boundary", () => {
    expect(repeatDueDates("2026-01-30", 4, 1)).toEqual([
      "2026-01-30",
      "2026-01-31",
      "2026-02-01",
      "2026-02-02",
    ]);
  });

  it("crosses a leap day", () => {
    // 2028 is a leap year; 2026 is not.
    expect(repeatDueDates("2028-02-28", 3, 1)).toEqual([
      "2028-02-28",
      "2028-02-29",
      "2028-03-01",
    ]);
    expect(repeatDueDates("2026-02-27", 3, 1)).toEqual([
      "2026-02-27",
      "2026-02-28",
      "2026-03-01",
    ]);
  });

  it("does not drift across a daylight-saving change", () => {
    // The reason this steps UTC calendar days rather than adding 86,400,000
    // milliseconds: in a DST zone one of those "days" is 23 or 25 hours long,
    // which lands two sessions on the same date or skips one entirely.
    // India has no DST, but a clinician abroad would hit it, and the run must
    // be five distinct consecutive days wherever it is generated.
    const spring = repeatDueDates("2026-03-27", 5, 1); // EU clocks go forward 29 Mar
    expect(spring).toEqual([
      "2026-03-27",
      "2026-03-28",
      "2026-03-29",
      "2026-03-30",
      "2026-03-31",
    ]);
    const autumn = repeatDueDates("2026-10-23", 5, 1); // and back 25 Oct
    expect(autumn).toEqual([
      "2026-10-23",
      "2026-10-24",
      "2026-10-25",
      "2026-10-26",
      "2026-10-27",
    ]);
    expect(new Set(spring).size).toBe(5);
    expect(new Set(autumn).size).toBe(5);
  });

  it("gives one date for a single occurrence", () => {
    expect(repeatDueDates("2026-03-02", 1, 1)).toEqual(["2026-03-02"]);
  });

  it("gives nulls when no due date was set", () => {
    // An assignment with no due date is still valid; it just has nothing to
    // space out, which is why repeating without one is rejected upstream.
    expect(repeatDueDates("", 3, 1)).toEqual([null, null, null]);
  });
});
