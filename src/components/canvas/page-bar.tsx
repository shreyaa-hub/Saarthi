"use client";

import { Plus, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import type { CanvasStoreApi } from "@/lib/canvas/store";
import { useCanvasStore } from "@/lib/canvas/store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Page navigation, on both surfaces. It used to be worksheet-only on the
// reasoning that an activity is a single screen — but a clinician building
// a multi-step activity has no way to say "and then this next task", which
// is exactly what a second page is. The patient's player paginates through
// them with Back/Next.
//
// The two surfaces call the same thing by different names: a printed
// worksheet has pages, an on-screen activity has slides. Same machinery,
// and the word the clinician sees matches the thing they are making.
export function PageBar({
  store,
  surface = "worksheet",
}: {
  store: CanvasStoreApi;
  surface?: "activity" | "worksheet";
}) {
  const pages = useCanvasStore(store, (s) => s.pages);
  const pageIndex = useCanvasStore(store, (s) => s.pageIndex);
  const { goToPage, addPage, removePage } = store.getState();

  const noun = surface === "activity" ? "Slide" : "Page";
  const nounLower = noun.toLowerCase();

  return (
    <div className="flex h-12 shrink-0 items-center gap-2 border-t border-border bg-card px-3">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => goToPage(pageIndex - 1)}
        disabled={pageIndex === 0}
        aria-label={`Previous ${nounLower}`}
      >
        <ChevronLeft className="size-4" />
      </Button>

      <div className="flex items-center gap-1 overflow-x-auto">
        {pages.map((page, i) => (
          <button
            key={page.id}
            type="button"
            onClick={() => goToPage(i)}
            aria-current={i === pageIndex ? "page" : undefined}
            className={cn(
              "flex h-8 min-w-8 shrink-0 items-center justify-center rounded-lg px-2 text-xs font-medium transition-colors cursor-pointer",
              i === pageIndex
                ? "bg-secondary text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {i + 1}
          </button>
        ))}
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => goToPage(pageIndex + 1)}
        disabled={pageIndex >= pages.length - 1}
        aria-label={`Next ${nounLower}`}
      >
        <ChevronRight className="size-4" />
      </Button>

      <span className="ml-1 text-xs text-muted-foreground">
        {noun} {pageIndex + 1} of {pages.length}
      </span>

      <div className="ml-auto flex items-center gap-1">
        <Button variant="outline" size="sm" onClick={addPage}>
          <Plus className="size-4" /> Add {nounLower}
        </Button>
        {/* A document must always have at least one page, so the control is
            hidden rather than disabled when there is only one. */}
        {pages.length > 1 && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => removePage(pageIndex)}
            aria-label={`Delete ${nounLower} ${pageIndex + 1}`}
          >
            <Trash2 className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
