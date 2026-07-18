"use client";

import { useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ConversationVisibilityProvider } from "@/lib/realtime/conversation-visibility-context";

// Mirrors Tailwind's default `md` breakpoint (768px) — the same one the
// `md:` classes below key off, kept as one number so the two can't drift
// apart. useSyncExternalStore, not useState+useEffect: this is exactly
// the "subscribe to a browser API" case it's designed for — the initial
// value is read synchronously via getSnapshot (no setState-in-effect,
// which the project's react-hooks lint correctly flags for a plain
// useEffect version of this), and getServerSnapshot supplies the SSR/
// first-paint fallback (false — window.matchMedia doesn't exist during
// SSR) so server and client agree on the first render, avoiding a
// hydration mismatch; corrected on the client via the subscription the
// moment React syncs external state, not via a fabricated post-mount
// setState call.
function subscribeToDesktopBreakpoint(onChange: () => void): () => void {
  const mql = window.matchMedia("(min-width: 768px)");
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

function getIsDesktopSnapshot(): boolean {
  return window.matchMedia("(min-width: 768px)").matches;
}

function getIsDesktopServerSnapshot(): boolean {
  return false;
}

function useIsDesktop(): boolean {
  return useSyncExternalStore(subscribeToDesktopBreakpoint, getIsDesktopSnapshot, getIsDesktopServerSnapshot);
}

// Same bounded-height fix as the patient Messages page: h-full can't
// resolve here because the shell's <main> sits in a min-h-screen chain (a
// floor, not a ceiling), so nothing stops content from growing past the
// viewport. calc() gives it a real upper bound instead; min-h-0 overrides
// the flex default of min-height:auto, which independently also lets a
// flex item grow to fit content instead of clamping.
//
// Responsive behaviour: on mobile there's no room for both panes, so
// exactly one is visible at a time, chosen by pathname — the bare
// /clinician/messages route shows the list (its natural "home"); any
// /clinician/messages/[id] route shows the detail pane, with a back link
// (in the detail pane itself) returning to the bare route. On desktop
// (md+) both are always visible side by side.
//
// detailVisible: the `hidden` Tailwind class below hides `detail` visually
// on mobile while the bare list route is shown, but hidden ≠ unmounted —
// MessageThread inside it keeps running its "conversation is active"
// mount effect regardless of CSS. detailVisible tells that effect the
// truth via ConversationVisibilityProvider, so it doesn't treat "mounted"
// as "the user is looking at this" on mobile, while leaving the actual
// CSS-based show/hide (and therefore the flash-free desktop experience)
// completely untouched.
export function MessagesSplitPane({ list, detail }: { list: React.ReactNode; detail: React.ReactNode }) {
  const pathname = usePathname();
  const isListRoute = pathname === "/clinician/messages";
  const isDesktop = useIsDesktop();
  const detailVisible = !isListRoute || isDesktop;

  return (
    <div className="flex h-[calc(100vh-6rem)] min-h-0 gap-4 md:h-[calc(100vh-7rem)]">
      <div className={cn("w-full shrink-0 md:block md:w-80", isListRoute ? "block" : "hidden")}>{list}</div>
      <div className={cn("min-w-0 flex-1", isListRoute ? "hidden md:block" : "block")}>
        <ConversationVisibilityProvider value={detailVisible}>{detail}</ConversationVisibilityProvider>
      </div>
    </div>
  );
}
