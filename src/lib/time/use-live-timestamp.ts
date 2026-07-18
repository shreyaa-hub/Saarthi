"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import {
  formatDateSeparator,
  formatListTimestamp,
  msUntilListTimestampGraduates,
  type FormattedTimestamp,
} from "./format";
import { subscribeToTimeInvalidation } from "./invalidation";

// useLayoutEffect only does anything on the client (there's no layout to
// synchronize with during SSR); using it directly in a component that's
// also server-rendered logs a harmless-but-noisy "useLayoutEffect does
// nothing on the server" warning. Swapping to useEffect specifically for
// the server environment is a no-op functionally (neither one runs during
// SSR either way) and just silences that warning — a standard, widely-used
// pattern, not specific to this file.
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

// Live timestamp for list/notification/"Active …" contexts: Just now →
// clock time → date-ladder, per format.ts. Two independent update paths:
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
// `iso` changing on an ALREADY-MOUNTED instance is a real, exercised path
// — not hypothetical: ConversationLastMessageTime is reused (same React
// key, same component instance) when a conversation's lastMessageAt prop
// updates from a live incoming message, exactly the flagship path of this
// whole feature. The recompute-on-iso-change effect below deliberately
// uses useLayoutEffect, not useEffect: useEffect runs after the browser
// paints, so the OLD label would be visibly rendered for one frame before
// snapping to the new one; useLayoutEffect runs synchronously after the
// DOM commit but before paint, so React flushes the corrective re-render
// before anything reaches the screen — no visible flash, no flicker.
// (An earlier version of this fix tried to correct this during render
// itself, comparing `iso` against a `prevIso` state value the same way
// ConversationList/NotificationBell/both Sidebars reconcile prop changes
// — but unlike those, this needs Date.now(), and calling an impure
// function during render is invalid per React's own rules, caught by
// this project's eslint config (react-hooks/purity) rather than by
// reasoning about it in advance.)
//
// SSR/hydration: the initial value is computed with whatever Date.now()
// the running environment has at first render — the server's during SSR,
// the client's during hydration. These can legitimately disagree by the
// network+render latency between the two passes, which can (rarely)
// straddle the 60s boundary and produce a one-time text mismatch. The
// mount-time resync below still matters for every OTHER case — e.g. a
// day-boundary or refocus invalidation that happened to fire between SSR
// and mount — but do not rely on it alone to fix a genuine hydration text
// mismatch; see TimeLabel's comment for why suppressHydrationWarning is
// deliberately NOT used here, and why a real mismatch is instead left to
// React's normal (self-healing) hydration-mismatch recovery.
export function useLiveTimestamp(iso: string): FormattedTimestamp {
  const [value, setValue] = useState(() => formatListTimestamp(iso, Date.now()));

  useIsomorphicLayoutEffect(() => {
    // Only the label can ever differ between recomputes of the SAME iso
    // (fullPrecision/iso are pure functions of `date`, never `now`) — so
    // bailing out on unchanged label via the functional updater form lets
    // React skip the re-render entirely for subscribers whose displayed
    // text genuinely didn't change (e.g. a 3-year-old timestamp on every
    // tab refocus), rather than re-rendering every live timestamp on
    // every invalidation regardless of whether anything visible moved.
    const recompute = () => {
      const fresh = formatListTimestamp(iso, Date.now());
      setValue((prev) => (prev.label === fresh.label ? prev : fresh));
    };

    // Mount-time / iso-change resync — see the module comment above.
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
// Same useLayoutEffect reasoning as useLiveTimestamp above.
export function useLiveDateSeparator(iso: string): FormattedTimestamp {
  const [value, setValue] = useState(() => formatDateSeparator(iso, Date.now()));

  useIsomorphicLayoutEffect(() => {
    const recompute = () => {
      const fresh = formatDateSeparator(iso, Date.now());
      setValue((prev) => (prev.label === fresh.label ? prev : fresh));
    };
    recompute();
    return subscribeToTimeInvalidation(recompute);
  }, [iso]);

  return value;
}
