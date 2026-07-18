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
// dates, and aren't part of this design). "Now"/"Today"/"Yesterday" go
// through Intl.RelativeTimeFormat rather than hardcoded English literals,
// for the same reason — verified directly (`node -e`) that it produces
// correctly idiomatic, correctly translated output ("now"/"today"/
// "yesterday" in en, "maintenant"/"aujourd'hui"/"hier" in fr, etc.).
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
//
// Every date-only <time dateTime="…"> value (formatDateSeparator's `iso`)
// is built from LOCAL date components, never Date#toISOString().slice(0,
// 10) — toISOString() is always UTC, so slicing it can name the wrong
// calendar day entirely for any viewer not at UTC+0 (confirmed directly:
// a message at 11:30pm local in America/New_York on Mar 10 serializes via
// toISOString() to "2025-03-11T03:30:00.000Z", so slicing gives
// "2025-03-11" — the next day — while every visible label on this same
// value, correctly computed from local Date components, would say
// "Today" or "Mar 10". A point-in-time value (formatListTimestamp's/
// formatBubbleTimestamp's `iso`) doesn't have this problem and
// deliberately keeps using toISOString() — a full UTC instant is
// inherently unambiguous; the bug is specific to truncating one down to
// just a date.

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

// YYYY-MM-DD from LOCAL date components — see the module comment on why
// this must not be Date#toISOString().slice(0, 10).
function toLocalDateOnlyIso(d: Date): string {
  const y = String(d.getFullYear()).padStart(4, "0");
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function capitalizeFirst(s: string): string {
  return s.length === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1);
}

// Small caches, keyed by locale + a tag for the fixed, small set of option
// shapes this module actually uses — constructing Intl.DateTimeFormat/
// Intl.RelativeTimeFormat has real, measurable overhead (locale
// negotiation), and a long message thread or conversation list can call
// these formatting functions for every visible row on every render;
// reusing formatter instances instead of building one per call avoids
// that cost. Bounded in practice to a handful of entries (one browser
// session typically has one locale × this module's fixed set of shapes).
const dateTimeFormatterCache = new Map<string, Intl.DateTimeFormat>();
function getDateTimeFormatter(locale: string | undefined, tag: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${locale ?? ""}|${tag}`;
  let formatter = dateTimeFormatterCache.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, options);
    dateTimeFormatterCache.set(key, formatter);
  }
  return formatter;
}

const relativeTimeFormatterCache = new Map<string, Intl.RelativeTimeFormat>();
function getRelativeTimeFormatter(locale: string | undefined): Intl.RelativeTimeFormat {
  const key = locale ?? "";
  let formatter = relativeTimeFormatterCache.get(key);
  if (!formatter) {
    formatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
    relativeTimeFormatterCache.set(key, formatter);
  }
  return formatter;
}

function nowLabel(locale: string | undefined): string {
  return capitalizeFirst(getRelativeTimeFormatter(locale).format(0, "second"));
}
function todayLabel(locale: string | undefined): string {
  return capitalizeFirst(getRelativeTimeFormatter(locale).format(0, "day"));
}
function yesterdayLabel(locale: string | undefined): string {
  return capitalizeFirst(getRelativeTimeFormatter(locale).format(-1, "day"));
}

export function formatClockTime(date: TimeInput, locale?: string): string {
  return getDateTimeFormatter(locale, "clock", { hour: "numeric", minute: "2-digit" }).format(toDate(date));
}

/** Full date, no time — for date-separator tooltips (a separator spans a
 * whole day, not a specific moment). */
export function formatFullDate(date: TimeInput, locale?: string): string {
  return getDateTimeFormatter(locale, "full-date", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(toDate(date));
}

/** Full date + time — for bubble/list/notification tooltips. */
export function formatFullDateTime(date: TimeInput, locale?: string): string {
  return getDateTimeFormatter(locale, "full-date-time", {
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
  const iso = toLocalDateOnlyIso(d);
  const fullPrecision = formatFullDate(d, locale);

  if (isSameLocalDay(d, n)) return { label: todayLabel(locale), iso, fullPrecision };

  const dayDiff = localDaysBetween(d, n);
  if (dayDiff === 1) return { label: yesterdayLabel(locale), iso, fullPrecision };
  if (dayDiff >= 2 && dayDiff <= 6) {
    return { label: getDateTimeFormatter(locale, "weekday", { weekday: "long" }).format(d), iso, fullPrecision };
  }

  const sameYear = d.getFullYear() === n.getFullYear();
  const label = getDateTimeFormatter(
    locale,
    sameYear ? "short-date" : "short-date-year",
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
    return { label: nowLabel(locale), iso, fullPrecision };
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
