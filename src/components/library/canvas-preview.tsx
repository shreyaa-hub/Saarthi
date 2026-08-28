"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { TemplateCanvas } from "@/lib/types/canvas";
import { allPages } from "@/lib/types/canvas";
import { pageStyleBackground } from "@/lib/canvas/page-style";
import { ElementPlayer } from "@/components/player/element-player";
import { SpeakDisabled } from "@/components/player/speak-button";

// A read-only rendering of a canvas, scaled to fit whatever box it is given.
//
// Reuses ElementPlayer rather than reimplementing the element renderers, so a
// preview cannot drift from what the patient actually sees. It is locked and
// given no responses, which is what makes it a preview rather than a go at
// the activity: inputs render in their answered-nothing state and reject
// interaction.
export function CanvasPreview({
  canvas,
  className,
}: {
  canvas: TemplateCanvas;
  className?: string;
}) {
  const pages = allPages(canvas);
  const [pageIndex, setPageIndex] = useState(0);
  const page = pages[Math.min(pageIndex, pages.length - 1)];

  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const compute = () => {
      const w = el.clientWidth - 16;
      const h = el.clientHeight - 16;
      if (w <= 0 || h <= 0) return;
      setScale(Math.min(w / canvas.width, h / canvas.height));
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [canvas.width, canvas.height]);

  return (
    <div className={className}>
      <div ref={containerRef} className="flex h-full w-full items-center justify-center overflow-hidden">
        {/* Held back until the fit is measured — rendering at scale 1 first
            makes a full-size canvas flash before it snaps down. */}
        {scale > 0 && (
          <div
            className="relative shrink-0 overflow-hidden rounded-md shadow-sm ring-1 ring-border"
            style={{ width: canvas.width * scale, height: canvas.height * scale }}
          >
            <div
              className="absolute left-0 top-0 origin-top-left"
              style={{
                width: canvas.width,
                height: canvas.height,
                transform: `scale(${scale})`,
                ...pageStyleBackground(page.pageStyle, canvas.background),
              }}
            >
              {/* No read-aloud in a thumbnail: the overlay below swallows
                  every click, so a speaker here would be a control that
                  visibly does nothing. */}
              {page.elements.map((el) => (
                <div
                  key={el.id}
                  className="absolute"
                  style={{ left: el.x, top: el.y, width: el.w, height: el.h }}
                >
                  <SpeakDisabled>
                    <ElementPlayer
                      element={el}
                      response={undefined}
                      onChange={() => {}}
                      onSubmit={() => {}}
                      locked
                      preview
                    />
                  </SpeakDisabled>
                </div>
              ))}
            </div>
            {/* Swallows clicks so nothing inside can be typed into or dragged,
                even where an element renderer ignores `locked`. */}
            <div className="absolute inset-0" aria-hidden />
          </div>
        )}
      </div>

      {pages.length > 1 && (
        <div className="mt-2 flex items-center justify-center gap-3 text-xs text-muted-foreground">
          <button
            type="button"
            aria-label="Previous page"
            disabled={pageIndex === 0}
            onClick={() => setPageIndex((i) => Math.max(0, i - 1))}
            className="flex size-6 items-center justify-center rounded hover:bg-muted disabled:opacity-40 cursor-pointer"
          >
            <ChevronLeft className="size-3.5" />
          </button>
          <span className="tabular-nums">
            Page {pageIndex + 1} of {pages.length}
          </span>
          <button
            type="button"
            aria-label="Next page"
            disabled={pageIndex >= pages.length - 1}
            onClick={() => setPageIndex((i) => Math.min(pages.length - 1, i + 1))}
            className="flex size-6 items-center justify-center rounded hover:bg-muted disabled:opacity-40 cursor-pointer"
          >
            <ChevronRight className="size-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
