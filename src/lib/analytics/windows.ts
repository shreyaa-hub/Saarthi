// All date-window and calendar-bucket math for the analytics layer, in one
// place (architectural req 2) so the product's "week" definition can change
// without hunting through components. Product decision: rolling 7-day
// windows anchored to local calendar days.
//
// Everything here works in the runtime's LOCAL time via Date's local
// component getters, matching the calendar-day approach the messaging
// timestamp system already established (DST-safe: day arithmetic goes
// through the Date constructor, never fixed-millisecond division). Note the
// aggregates run server-side, so "local" is the server's timezone; for
// 7-day windows and day/week buckets this coarseness only ever affects
// attempts within a few hours of a boundary and never changes a weekly
// average meaningfully. A future per-clinician timezone can be threaded
// through here alone.

import type { WindowRange } from "./types";

export function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

// Add (or subtract) whole days via local calendar components, so crossing a
// DST boundary still lands on the intended wall-clock day rather than
// drifting by an hour the way `time + n*86_400_000` would.
export function addDays(d: Date, days: number): Date {
  return new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate() + days,
    d.getHours(),
    d.getMinutes(),
    d.getSeconds(),
    d.getMilliseconds(),
  );
}

// Monday as the first day of the week — only used for optional weekly trend
// bucketing, not for the rolling comparison windows, so the choice is
// presentational rather than a product rule.
export function startOfLocalWeek(d: Date): Date {
  const day = startOfLocalDay(d);
  const mondayIndex = (day.getDay() + 6) % 7; // Sun=0..Sat=6  ->  Mon=0..Sun=6
  return addDays(day, -mondayIndex);
}

export function startOfLocalMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function isWithin(range: WindowRange, date: Date | string): boolean {
  const t = (typeof date === "string" ? new Date(date) : date).getTime();
  return t >= range.start.getTime() && t < range.end.getTime();
}

export type RollingWeekWindows = { thisWeek: WindowRange; lastWeek: WindowRange };

// This Week  = the 7 local days ending today (today and the previous 6).
// Last Week  = the 7 local days immediately before that.
// The two ranges tile exactly: lastWeek.end === thisWeek.start, and
// thisWeek.end is the start of tomorrow so everything logged today counts.
export function rollingWeekWindows(now: Date): RollingWeekWindows {
  const todayStart = startOfLocalDay(now);
  const thisWeekStart = addDays(todayStart, -6);
  const thisWeekEnd = addDays(todayStart, 1); // exclusive: start of tomorrow
  const lastWeekStart = addDays(todayStart, -13);
  const lastWeekEnd = thisWeekStart;
  return {
    thisWeek: { start: thisWeekStart, end: thisWeekEnd },
    lastWeek: { start: lastWeekStart, end: lastWeekEnd },
  };
}
