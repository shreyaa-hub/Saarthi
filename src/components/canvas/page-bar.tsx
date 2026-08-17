"use client";

import { Plus, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import type { CanvasStoreApi } from "@/lib/canvas/store";
import { useCanvasStore } from "@/lib/canvas/store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Page navigation for multi-page worksheets. Only rendered on the worksheet
// surface: an interactive activity is a single screen, so pages would be
// meaningless there and the bar would just be clutter.
export function PageBar({ store }: { store: CanvasStoreApi }) {
  const pages = useCanvasStore(store, (s) => s.pages);
  const pageIndex = useCanvasStore(store, (s) => s.pageIndex);
  const { goToPage, addPage, removePage } = store.getState();

  return (
    <div className="flex h-12 shrink-0 items-center gap-2 border-t border-border bg-card px-3">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => goToPage(pageIndex - 1)}
        disabled={pageIndex === 0}
        aria-label="Previous page"
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
        aria-label="Next page"
      >
        <ChevronRight className="size-4" />
      </Button>

      <span className="ml-1 text-xs text-muted-foreground">
        Page {pageIndex + 1} of {pages.length}
      </span>

      <div className="ml-auto flex items-center gap-1">
        <Button variant="outline" size="sm" onClick={addPage}>
          <Plus className="size-4" /> Add page
        </Button>
        {/* A document must always have at least one page, so the control is
            hidden rather than disabled when there is only one. */}
        {pages.length > 1 && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => removePage(pageIndex)}
            aria-label={`Delete page ${pageIndex + 1}`}
          >
            <Trash2 className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
