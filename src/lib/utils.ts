import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// No default plural suffix on purpose — a naive `${singular}s` default has
// already produced a real bug in this codebase ("3 activitys"); requiring
// callers to spell out the plural form keeps that class of mistake from
// coming back silently.
export function pluralize(n: number, singular: string, pluralForm: string) {
  return `${n} ${n === 1 ? singular : pluralForm}`;
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function formatDate(date: string | Date) {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

export function formatRelativeTime(date: string | Date) {
  const d = typeof date === "string" ? new Date(date) : date;
  const seconds = Math.round((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(d);
}

// How an attempt's result reads wherever it is listed.
//
// An activity with nothing to mark — all drawings, a story to read through —
// has no accuracy, and the old "0/0 (100%)" said the opposite: a perfect
// score for a patient who was assessed on nothing. A zero total is the
// reliable signal for that, and it covers rows written before the score
// column started storing null for it.
export function formatAttemptResult(
  correct: number,
  total: number,
  score: number | null,
): string {
  if (total === 0) return "Not scored";
  const pct = score ?? Math.round((correct / total) * 100);
  return `${correct}/${total} (${pct}%)`;
}
