import type { FormattedTimestamp } from "@/lib/time/format";

// Renders any FormattedTimestamp (bubble/list/notification/separator —
// see lib/time/format.ts) as a native <time> element, uniformly giving
// every abbreviated/relative label a full-precision counterpart: `title`
// for mouse hover, `aria-label` for screen readers (replacing the
// abbreviated text as the accessible name, so assistive tech always hears
// the unambiguous version, not "2h ago" or "Mon"), and `dateTime` as the
// machine-readable value. This is the one place that pairing is
// implemented — every timestamp in the app should render through this
// component rather than re-deriving the pattern per call site.
//
// No "use client" here: this is a plain presentational component with no
// hooks of its own, so it works from both Server and Client Components —
// callers needing live updates use useLiveTimestamp/useLiveDateSeparator
// (both client-only) to produce the FormattedTimestamp, then hand it to
// this component; callers with a static value (message bubbles) can pass
// one computed directly via formatBubbleTimestamp with no hook at all.
//
// Deliberately NOT using suppressHydrationWarning, despite this being
// exactly the "live timestamp" case React's own docs cite as its
// canonical use — verified empirically (see the dev-timestamp-preview
// harness used during this feature's testing) that it doesn't do what
// that framing suggests. When the server and client genuinely disagree
// on this text at hydration time (a real, if rare, possibility — see
// use-live-timestamp.ts), suppressHydrationWarning silences the console
// warning as documented, but the mismatched text child gets adopted
// as-is and then never updates again on subsequent re-renders, even
// though the surrounding element's own attributes (title/aria-label/
// dateTime) DO keep updating normally — a stale, silently-wrong label
// stuck for the component's whole lifetime, exactly defeating the
// "mount-time resync corrects it" fix in use-live-timestamp.ts. Leaving
// the warning enabled means React's normal hydration-mismatch recovery
// runs instead (discarding and re-rendering just that subtree from the
// client's own state), which self-heals correctly — confirmed directly
// by removing suppressHydrationWarning and re-testing. The cost is an
// occasional console warning in dev mode for the rare case a message
// really did arrive within the SSR-to-hydration window; that's a
// developer-visible nuisance, not a user-visible bug, and by far the
// lesser problem versus a timestamp that's silently wrong forever.
export function TimeLabel({ timestamp, className }: { timestamp: FormattedTimestamp; className?: string }) {
  return (
    <time dateTime={timestamp.iso} title={timestamp.fullPrecision} aria-label={timestamp.fullPrecision} className={className}>
      {timestamp.label}
    </time>
  );
}
