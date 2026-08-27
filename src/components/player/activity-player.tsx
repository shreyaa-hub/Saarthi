"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, PartyPopper, RotateCcw, Maximize2, Minimize2 } from "lucide-react";
import { toast } from "sonner";
import type { TemplateCanvas } from "@/lib/types/canvas";
import { isInteractive, allPages } from "@/lib/types/canvas";
import { scoreCanvas, type Responses } from "@/lib/scoring";
import { pageStyleBackground } from "@/lib/canvas/page-style";
import { submitAttempt } from "@/lib/actions/patient";
import { ElementPlayer } from "./element-player";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useFullscreen } from "@/lib/canvas/use-fullscreen";
import { cn } from "@/lib/utils";

// `practice` runs the same player over a library item the patient chose
// themselves. It scores and shows the result, but records nothing: an attempt
// row belongs to an assignment, and self-selected practice folded into the
// clinical record would move the accuracy trends a clinician reads without
// them ever having prescribed the work.
export function ActivityPlayer({
  assignmentId,
  title,
  canvas,
  alreadyCompleted,
  practice = false,
  backHref = "/patient",
  backLabel = "my missions",
}: {
  assignmentId: string;
  title: string;
  canvas: TemplateCanvas;
  alreadyCompleted: boolean;
  practice?: boolean;
  backHref?: string;
  backLabel?: string;
}) {
  const router = useRouter();
  const [responses, setResponses] = useState<Responses>({});
  const [locked, setLocked] = useState(alreadyCompleted);
  const [result, setResult] = useState<{ correct: number; total: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const startedAt = useRef<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  // The whole player goes fullscreen, not just the canvas, so the header
  // (progress, Submit) and the slide navigation stay reachable — a patient
  // dropped into a bare canvas with no way to submit would be stuck.
  const shellRef = useRef<HTMLDivElement>(null);
  const { isFullscreen, supported: fullscreenSupported, toggle: toggleFullscreen } = useFullscreen();

  // An activity can be several slides (a worksheet, several pages). Page 1
  // lives in canvas.elements and the rest in canvas.pages; allPages is the
  // one place that knows that, so everything here works in terms of a flat
  // list. This player used to render canvas.elements directly, which meant
  // a patient never saw anything past the first page at all.
  const pages = useMemo(() => allPages(canvas), [canvas]);
  const [pageIndex, setPageIndex] = useState(0);
  const page = pages[pageIndex] ?? pages[0];
  const isLastPage = pageIndex >= pages.length - 1;

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const compute = () => {
      const availableWidth = el.clientWidth - 32;
      const availableHeight = el.clientHeight - 32;
      const next = Math.min(1, availableWidth / canvas.width, availableHeight / canvas.height);
      setScale(next > 0 ? next : 1);
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [canvas.width, canvas.height]);

  // Progress counts every question in the whole activity, not just the
  // current slide — "3/4 answered" has to mean the thing being submitted,
  // and submitting scores all pages.
  const allInteractive = useMemo(
    () => pages.flatMap((p) => p.elements).filter(isInteractive),
    [pages],
  );
  const interactiveCount = allInteractive.length;
  const answeredCount = allInteractive.filter((el) => {
    const r = responses[el.id];
    if (r === undefined || r === null) return false;
    if (Array.isArray(r)) return r.length > 0;
    if (typeof r === "object") return Object.keys(r as object).length > 0;
    return String(r).trim().length > 0;
  }).length;

  const handleSubmit = async () => {
    if (locked || submitting) return;
    setSubmitting(true);
    const { correct, total } = scoreCanvas(canvas, responses);

    if (!practice) {
      const durationSeconds = Math.round((Date.now() - (startedAt.current ?? Date.now())) / 1000);
      const { error } = await submitAttempt(assignmentId, {
        responses,
        correctCount: correct,
        totalCount: total,
        durationSeconds,
      });
      if (error) {
        setSubmitting(false);
        toast.error(error);
        return;
      }
    }

    setSubmitting(false);
    setResult({ correct, total });
    setLocked(true);
  };

  if (result) {
    const pct = result.total > 0 ? Math.round((result.correct / result.total) * 100) : 100;
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-muted/30 px-4 text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-success/15 text-success">
          <PartyPopper className="size-8" />
        </span>
        <h1 className="text-2xl font-bold">Nice work!</h1>
        <p className="text-muted-foreground">
          You scored {result.correct} out of {result.total} ({pct}%) on &ldquo;{title}&rdquo;.
        </p>
        {practice && (
          <p className="max-w-sm text-sm text-muted-foreground">
            This was practice you picked yourself, so it stays with you — it is not added to
            your progress or sent to your clinician.
          </p>
        )}
        <div className="flex flex-wrap justify-center gap-2">
          {practice && (
            <Button
              variant="outline"
              onClick={() => {
                setResponses({});
                setResult(null);
                setLocked(false);
                startedAt.current = Date.now();
              }}
            >
              <RotateCcw className="size-4" /> Try again
            </Button>
          )}
          <Button onClick={() => router.push(backHref)}>Back to {backLabel}</Button>
        </div>
      </div>
    );
  }

  return (
    <div ref={shellRef} className="flex h-screen flex-col bg-background">
      <header className="flex h-16 items-center justify-between gap-4 border-b border-border bg-card px-4">
        <div className="flex min-w-0 items-center gap-3">
          <Link href={backHref} className="flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted">
            <ArrowLeft className="size-4" />
          </Link>
          <h1 className="truncate font-semibold">{title}</h1>
        </div>
        <div className="flex items-center gap-3">
          {interactiveCount > 0 && !locked && (
            <div className="hidden items-center gap-2 sm:flex">
              <Progress value={(answeredCount / interactiveCount) * 100} className="w-32" />
              <span className="text-xs text-muted-foreground">
                {answeredCount}/{interactiveCount}
              </span>
            </div>
          )}
          {fullscreenSupported && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => toggleFullscreen(shellRef.current)}
              title={isFullscreen ? "Leave fullscreen" : "Fullscreen"}
              aria-label={isFullscreen ? "Leave fullscreen" : "Enter fullscreen"}
            >
              {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            </Button>
          )}
          {locked ? (
            <Button variant="outline" size="sm" onClick={() => router.push(backHref)}>
              <RotateCcw className="size-4" /> Done
            </Button>
          ) : isLastPage ? (
            <Button size="sm" onClick={handleSubmit} disabled={submitting}>
              Submit
            </Button>
          ) : (
            // One primary action, always in the same corner: it reads Next
            // until the last slide and Submit there, so a patient part-way
            // through a multi-slide activity can't submit work they haven't
            // been shown yet.
            <Button size="sm" onClick={() => setPageIndex((i) => i + 1)}>
              Next <ArrowRight className="size-4" />
            </Button>
          )}
        </div>
      </header>

      <div ref={containerRef} className="canvas-surface flex flex-1 items-center justify-center overflow-auto p-4">
        <div
          className="relative shrink-0 shadow-lg ring-1 ring-border"
          style={{ width: canvas.width * scale, height: canvas.height * scale }}
        >
          <div
            // Keyed by page so React remounts the slide's elements rather
            // than reusing them positionally — without this, the transient
            // local state inside a player (Memory Match's face-up cards,
            // say) would carry over into whatever element happened to land
            // at the same index on the next slide.
            key={page.id}
            className="absolute left-0 top-0 origin-top-left"
            style={{
              width: canvas.width,
              height: canvas.height,
              transform: `scale(${scale})`,
              ...pageStyleBackground(page.pageStyle, canvas.background),
            }}
          >
            {page.elements.map((el) => (
              <div key={el.id} className="absolute" style={{ left: el.x, top: el.y, width: el.w, height: el.h }}>
                <ElementPlayer
                  element={el}
                  response={responses[el.id]}
                  onChange={(value) => setResponses((r) => ({ ...r, [el.id]: value }))}
                  locked={locked}
                  onSubmit={handleSubmit}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Only for genuinely multi-slide activities — a single-slide one
          looks exactly as it always has. Navigation stays available after
          submitting so the patient can page back through their answers. */}
      {pages.length > 1 && (
        <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-t border-border bg-card px-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPageIndex((i) => i - 1)}
            disabled={pageIndex === 0}
          >
            <ArrowLeft className="size-4" /> Back
          </Button>

          <div className="flex items-center gap-1.5">
            {pages.map((p, i) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPageIndex(i)}
                aria-label={`Go to slide ${i + 1}`}
                aria-current={i === pageIndex ? "step" : undefined}
                className={cn(
                  "size-2.5 rounded-full transition-colors",
                  i === pageIndex ? "bg-primary" : "bg-muted-foreground/30 hover:bg-muted-foreground/60",
                )}
              />
            ))}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs tabular-nums text-muted-foreground">
              Slide {pageIndex + 1} of {pages.length}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPageIndex((i) => i + 1)}
              disabled={isLastPage}
            >
              Next <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
