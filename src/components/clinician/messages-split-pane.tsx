"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

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
export function MessagesSplitPane({ list, detail }: { list: React.ReactNode; detail: React.ReactNode }) {
  const pathname = usePathname();
  const isListRoute = pathname === "/clinician/messages";

  return (
    <div className="flex h-[calc(100vh-6rem)] min-h-0 gap-4 md:h-[calc(100vh-7rem)]">
      <div className={cn("w-full shrink-0 md:block md:w-80", isListRoute ? "block" : "hidden")}>{list}</div>
      <div className={cn("min-w-0 flex-1", isListRoute ? "hidden md:block" : "block")}>{detail}</div>
    </div>
  );
}
