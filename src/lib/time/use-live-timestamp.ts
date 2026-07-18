"use client";

import { useEffect, useState } from "react";
import {
  formatDateSeparator,
  formatListTimestamp,
  msUntilListTimestampGraduates,
  type FormattedTimestamp,
} from "./format";
import { subscribeToTimeInvalidation } from "./invalidation";

// Live timestamp for list/notification/"Active …" contexts: Just now →
// clock time → date-ladder, per format.ts. Two independent update paths,
// both effect-driven (subscribing to the passage of real time is exactly
// what useEffect is for — this isn't a prop to mirror):
//
//  - a single one-shot setTimeout for the one deterministic transition
//    every fresh timestamp goes through (Just now → clock time, at
//    exactly 60s old) — not a recurring ticker, since nothing here counts
//    through minutes anymore;
//  - a subscription to the shared day-change/refocus signal
//    (invalidation.ts) for the coarser "a new calendar day started, or
//    the tab regained focus" case.
//
// Once a timestamp is >60s old, no timer is scheduled at all — it's a
// static label until the shared day-boundary signal (if ever) fires.
//
// SSR/hydration: the initial value is computed with whatever Date.now()
// the running environment has at first render — the server's during SSR,
// the client's during hydration. These can legitimately disagree by the
// network+render latency between the two passes, which can (rarely)
// straddle the 60s boundary and produce a one-time text mismatch. The
// mount-time resync below (recompute() called synchronously on mount)
// still matters for every OTHER case — e.g. a day-boundary or refocus
// invalidation that happened to fire between SSR and mount — but do not
// rely on it alone to fix a genuine hydration text mismatch; see
// TimeLabel's comment for why suppressHydrationWarning is deliberately
// NOT used here, and why a real mismatch is instead left to React's
// normal (self-healing) hydration-mismatch recovery.
export function useLiveTimestamp(iso: string): FormattedTimestamp {
  const [value, setValue] = useState(() => formatListTimestamp(iso, Date.now()));

  useEffect(() => {
    const recompute = () => setValue(formatListTimestamp(iso, Date.now()));

    // Mount-time resync — closes any non-hydration-mismatch timing drift
    // immediately (see the module comment above for the hydration case
    // specifically).
    recompute();

    const unsubscribe = subscribeToTimeInvalidation(recompute);

    const msUntilGraduation = msUntilListTimestampGraduates(iso, Date.now());
    const timer = msUntilGraduation === null ? undefined : setTimeout(recompute, msUntilGraduation);

    return () => {
      unsubscribe();
      if (timer !== undefined) clearTimeout(timer);
    };
  }, [iso]);

  return value;
}

// Live date-separator label: Today/Yesterday/weekday/date only — no
// "Just now" state (a separator represents a whole day, not a moment), so
// it only needs the day-boundary/refocus signal, never a one-shot timer.
export function useLiveDateSeparator(iso: string): FormattedTimestamp {
  const [value, setValue] = useState(() => formatDateSeparator(iso, Date.now()));

  useEffect(() => {
    const recompute = () => setValue(formatDateSeparator(iso, Date.now()));
    recompute();
    return subscribeToTimeInvalidation(recompute);
  }, [iso]);

  return value;
}
