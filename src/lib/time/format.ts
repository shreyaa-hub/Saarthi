// Pure timestamp-formatting logic for the messaging surfaces (message
// bubbles, conversation list, notifications, "Active …" indicators, date
// separators). Deliberately has no React/browser dependency — every
// function here takes its reference instant (`now`) as an explicit
// argument rather than reaching for Date.now() internally, so the whole
// module is a plain, unit-testable pure-function library; the React layer
// (use-live-timestamp.ts) is a thin wrapper that supplies the real clock
// and re-invokes these on the schedule described there.
//
// Locale is always passed through as `undefined` unless a caller
// overrides it, which resolves to the runtime's own default locale via
// Intl — never hardcode "en-US" here, that was the bug in the old
// formatDate/formatRelativeTime pair in lib/utils.ts (left untouched;
// those still serve unrelated, non-messaging surfaces like assignment due
// dates, and aren't part of this design).
//
// Calendar-day comparisons are always done by comparing year/month/day
// components of local Date objects, never by dividing elapsed
// milliseconds by a fixed day-length constant. That division is the classic
// bug: it misclassifies "Yesterday" based on elapsed hours instead of
// actual local-midnight crossings (a message from 11:58pm yesterday,
// viewed 4 minutes later at 12:02am today, has ~4 minutes elapsed but
// must say "Yesterday"), and it drifts by the DST delta on the two days a
// year the local day isn't exactly 24 hours long. Comparing Date
// components sidesteps both: DST and calendar-day arithmetic are handled
// by the JS Date/Intl implementation, not hand-rolled here.

export type FormattedTimestamp = {
  /** The abbreviated/relative text to display. */
  label: string;
  /** Machine-readable value for <time dateTime="…">. */
  iso: string;
  /** Full, unambiguous text for title/aria-label — always present, even
   * when `label` is already unambiguous, so callers can apply it uniformly. */
  fullPrecision: string;
};

const ONE_MINUTE_MS = 60_000;

export type TimeInput = Date | string | number;

function toDate(value: TimeInput): Date {
  return value instanceof Date ? value : new Date(value);
}

function isSameLocalDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// Whole local-calendar-days between two instants (b − a), based on local
// midnight boundaries, not elapsed milliseconds — see the module comment.
function localDaysBetween(a: Date, b: Date): number {
  const da = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const db = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return Math.round((db - da) / 86_400_000);
}

export function formatClockTime(date: TimeInput, locale?: string): string {
  return new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" }).format(toDate(date));
}

/** Full date, no time — for date-separator tooltips (a separator spans a
 * whole day, not a specific moment). */
export function formatFullDate(date: TimeInput, locale?: string): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(toDate(date));
}

/** Full date + time — for bubble/list/notification tooltips. */
export function formatFullDateTime(date: TimeInput, locale?: string): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(toDate(date));
}

/**
 * The date-only ladder: Today / Yesterday / weekday (2–6 days back) /
 * short date / short date + year (different calendar year). Used for date
 * separators directly, and as the fallback tail of formatListTimestamp
 * below once a timestamp is no longer "today".
 */
export function formatDateSeparator(date: TimeInput, now: TimeInput = new Date(), locale?: string): FormattedTimestamp {
  const d = toDate(date);
  const n = toDate(now);
  const iso = d.toISOString().slice(0, 10);
  const fullPrecision = formatFullDate(d, locale);

  if (isSameLocalDay(d, n)) return { label: "Today", iso, fullPrecision };

  const dayDiff = localDaysBetween(d, n);
  if (dayDiff === 1) return { label: "Yesterday", iso, fullPrecision };
  if (dayDiff >= 2 && dayDiff <= 6) {
    return { label: new Intl.DateTimeFormat(locale, { weekday: "long" }).format(d), iso, fullPrecision };
  }

  const sameYear = d.getFullYear() === n.getFullYear();
  const label = new Intl.DateTimeFormat(
    locale,
    sameYear ? { month: "short", day: "numeric" } : { month: "short", day: "numeric", year: "numeric" },
  ).format(d);
  return { label, iso, fullPrecision };
}

/**
 * The full list/notification/"Active …" ladder: Just now (<60s) → clock
 * time (same local day) → the date-separator ladder for anything older.
 * Negative elapsed time (device clock skew, or a message that looks
 * "future" relative to the viewer's clock) clamps to "Just now" rather
 * than displaying a nonsensical future-relative label.
 */
export function formatListTimestamp(date: TimeInput, now: TimeInput = new Date(), locale?: string): FormattedTimestamp {
  const d = toDate(date);
  const n = toDate(now);
  const iso = d.toISOString();
  const fullPrecision = formatFullDateTime(d, locale);
  const elapsedMs = n.getTime() - d.getTime();

  if (elapsedMs < ONE_MINUTE_MS) {
    return { label: "Just now", iso, fullPrecision };
  }
  if (isSameLocalDay(d, n)) {
    return { label: formatClockTime(d, locale), iso, fullPrecision };
  }
  const separator = formatDateSeparator(d, n, locale);
  return { label: separator.label, iso, fullPrecision };
}

/** Message bubbles: always absolute clock time, never relative — see the
 * design discussion for why bubbles don't need a "Just now" state (the
 * clock time is already correct the instant it's rendered). No `now`
 * argument: this never depends on the current time, so it never needs
 * live updates. */
export function formatBubbleTimestamp(date: TimeInput, locale?: string): FormattedTimestamp {
  const d = toDate(date);
  return {
    label: formatClockTime(d, locale),
    iso: d.toISOString(),
    fullPrecision: formatFullDateTime(d, locale),
  };
}

/** Exported for message-thread.tsx's date-separator grouping — deciding
 * where to insert a separator is the same "same local day" question as
 * everything else in this module. */
export { isSameLocalDay };

/** Milliseconds until this timestamp's "Just now" window closes (i.e.
 * until it's 60s old) — or null if it's already past that point, meaning
 * no timer is needed at all. Used by the live hook to schedule the single
 * Just-now → clock-time transition precisely, instead of polling. */
export function msUntilListTimestampGraduates(date: TimeInput, now: TimeInput = new Date()): number | null {
  const elapsedMs = toDate(now).getTime() - toDate(date).getTime();
  if (elapsedMs >= ONE_MINUTE_MS) return null;
  return ONE_MINUTE_MS - elapsedMs;
}
