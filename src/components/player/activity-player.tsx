"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, PartyPopper, RotateCcw, Maximize2, Minimize2, Printer } from "lucide-react";
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
import { fitScale } from "@/lib/canvas/fit-scale";
import { cn } from "@/lib/utils";

// Below this shrink-to-fit factor the canvas layout is abandoned for a
// stacked one. Chosen from measurement rather than a device breakpoint: what
// matters is how small the authored content ends up, and a 900px-wide canvas
// on a 390px phone lands at 0.4 — where a drag-to-match's answer chips came
// out 16 CSS pixels tall. Two thirds still reads as "small but usable"; below
// that it stops being usable at all.
//
// Deriving it from the scale rather than the viewport also means a wide
// activity stacks on a tablet while a narrow one does not, which is the
// behaviour that actually matches what the patient can touch.
const STACK_BELOW_SCALE = 0.66;

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
  practiceNote,
  backHref = "/patient",
  backLabel = "my missions",
  printHref,
}: {
  assignmentId: string;
  title: string;
  canvas: TemplateCanvas;
  alreadyCompleted: boolean;
  practice?: boolean;
  // What the results screen says about where this attempt went. The default
  // is written for a patient practising from the library; a clinician trying
  // out their own template is told something else, because "not sent to your
  // clinician" is nonsense when you are the clinician.
  practiceNote?: string;
  backHref?: string;
  backLabel?: string;
  // The printable version of this same activity. Given as a URL rather than
  // printing the player itself: the player is a scaled, interactive view with
  // app chrome around it, and printing that puts a screenshot of a screen on
  // the paper. The print route renders the canvas at its authored size, one
  // page per sheet, with the answer key stripped.
  printHref?: string;
}) {
  const router = useRouter();
  const [responses, setResponses] = useState<Responses>({});
  const [locked, setLocked] = useState(alreadyCompleted);
  const [result, setResult] = useState<{ correct: number; total: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const startedAt = useRef<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  // Starts false so the server and the first client render agree; the
  // ResizeObserver below flips it once the real width is known.
  const [stacked, setStacked] = useState(false);

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
      const next = fitScale(el.clientWidth, el.clientHeight, canvas.width, canvas.height, isFullscreen);
      setScale(next);
      // Below this the shrink-to-fit layout stops being usable rather than
      // merely small — see STACK_BELOW_SCALE. Never in fullscreen, where there
      // is by definition room to lay the canvas out at size.
      setStacked(!isFullscreen && next < STACK_BELOW_SCALE);
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
    // isFullscreen: entering or leaving changes both the cap and the padding,
    // so the scale has to be recomputed, not only when the element resizes.
  }, [canvas.width, canvas.height, isFullscreen]);

  // Reading order for the stacked layout: down the page, then across. The
  // authored canvas is spatial, and a phone is not, so something has to
  // decide the order — top-to-bottom is what a person reading the sheet
  // would do, with a tolerance so two elements roughly side by side are
  // taken left to right rather than by a few pixels of vertical drift.
  const stackedElements = useMemo(() => {
    const ROW_TOLERANCE = 40;
    return [...page.elements].sort((a, b) =>
      Math.abs(a.y - b.y) > ROW_TOLERANCE ? a.y - b.y : a.x - b.x,
    );
  }, [page.elements]);

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
    // Practice is never recorded, so it is marked here and nowhere else.
    // A real attempt is marked by the server, and the numbers shown are the
    // ones it actually stored — the client no longer gets a say in the score,
    // and the results screen cannot drift from the clinician's record.
    if (practice) {
      const { correct, total } = scoreCanvas(canvas, responses);
      setSubmitting(false);
      setResult({ correct, total });
      setLocked(true);
      return;
    }

    const durationSeconds = Math.round((Date.now() - (startedAt.current ?? Date.now())) / 1000);
    const result = await submitAttempt(assignmentId, { responses, durationSeconds });
    if (result.error) {
      setSubmitting(false);
      toast.error(result.error);
      return;
    }

    setSubmitting(false);
    setResult({ correct: result.correct ?? 0, total: result.total ?? 0 });
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
            {practiceNote ??
              "This was practice you picked yourself, so it stays with you — it is not added to your progress or sent to your clinician."}
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
          {printHref && (
            <Button variant="outline" asChild>
              <a href={printHref} target="_blank" rel="noopener noreferrer">
                <Printer className="size-4" /> Download as PDF
              </a>
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
          <Link
            href={backHref}
            aria-label={`Back to ${backLabel}`}
            className="flex size-11 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
          >
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
          {printHref && (
            <Button
              variant="ghost"
              size="icon"
              asChild
              title="Print or save as PDF"
            >
              <a href={printHref} target="_blank" rel="noopener noreferrer" aria-label="Print or save this activity as a PDF">
                <Printer className="size-4" />
              </a>
            </Button>
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
            <Button variant="outline" size="sm" className="min-h-11" onClick={() => router.push(backHref)}>
              <RotateCcw className="size-4" /> Done
            </Button>
          ) : isLastPage ? (
            <Button size="sm" className="min-h-11 px-5" onClick={handleSubmit} disabled={submitting}>
              Submit
            </Button>
          ) : (
            // One primary action, always in the same corner: it reads Next
            // until the last slide and Submit there, so a patient part-way
            // through a multi-slide activity can't submit work they haven't
            // been shown yet.
            <Button size="sm" className="min-h-11 px-5" onClick={() => setPageIndex((i) => i + 1)}>
              Next <ArrowRight className="size-4" />
            </Button>
          )}
        </div>
      </header>

      <div
        ref={containerRef}
        className={cn(
          "canvas-surface flex flex-1 overflow-auto",
          isFullscreen ? "p-2" : "p-4",
          stacked ? "flex-col items-stretch gap-4" : "items-center justify-center",
        )}
      >
        {stacked ? (
          // One element per row at the full width of the screen, in reading
          // order, with no transform at all.
          //
          // Shrinking the whole canvas to fit a phone is what broke this:
          // measured on a 390px screen, a drag-to-match's answer chips came
          // out 112x16 CSS pixels. WCAG 2.5.8 asks for 24 and Apple's
          // guidance is 44 — and the people using this are children, some of
          // them with the fine-motor difficulty the app exists to treat.
          //
          // Dropping the transform is what fixes it, not a bigger scale
          // factor. Every interactive player lays its own contents out with
          // flexbox already, so given a full-width box they reflow and their
          // targets grow to the size their padding and font-size imply.
          //
          // Capped and centred, because a full-bleed column on a tablet gives
          // line lengths nobody can read.
          <div key={page.id} className="mx-auto flex w-full max-w-2xl flex-col gap-4">
            {stackedElements.map((el) => (
              <div
                key={el.id}
                // No frame of its own: every interactive player already draws
                // a bordered card, and wrapping a plain heading in a second
                // one made the title look like a stray empty box.
                className="shrink-0"
                // Width comes from the column; the authored height is kept as
                // a floor so nothing collapses, but content may grow past it.
                style={{ minHeight: el.h }}
              >
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
        ) : (
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
        )}
      </div>

      {/* Only for genuinely multi-slide activities — a single-slide one
          looks exactly as it always has. Navigation stays available after
          submitting so the patient can page back through their answers. */}
      {pages.length > 1 && (
        <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-t border-border bg-card px-4">
          <Button
            variant="outline"
            size="sm"
            className="min-h-11"
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
                // The dot stays 10px but the button around it is 44: the hit
                // area grows without the indicator turning into a row of
                // buttons.
                className="flex size-11 items-center justify-center"
              >
                <span
                  className={cn(
                    "block size-2.5 rounded-full transition-colors",
                    i === pageIndex ? "bg-primary" : "bg-muted-foreground/30 hover:bg-muted-foreground/60",
                  )}
                />
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs tabular-nums text-muted-foreground">
              Slide {pageIndex + 1} of {pages.length}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="min-h-11"
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
