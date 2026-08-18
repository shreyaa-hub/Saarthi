"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, PartyPopper, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import type { TemplateCanvas } from "@/lib/types/canvas";
import { isInteractive } from "@/lib/types/canvas";
import { scoreCanvas, type Responses } from "@/lib/scoring";
import { pageStyleBackground } from "@/lib/canvas/page-style";
import { submitAttempt } from "@/lib/actions/patient";
import { ElementPlayer } from "./element-player";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

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

  const interactiveCount = canvas.elements.filter(isInteractive).length;
  const answeredCount = canvas.elements.filter(isInteractive).filter((el) => {
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
    <div className="flex h-screen flex-col">
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
          {locked ? (
            <Button variant="outline" size="sm" onClick={() => router.push(backHref)}>
              <RotateCcw className="size-4" /> Done
            </Button>
          ) : (
            <Button size="sm" onClick={handleSubmit} disabled={submitting}>
              Submit
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
            className="absolute left-0 top-0 origin-top-left"
            style={{
              width: canvas.width,
              height: canvas.height,
              transform: `scale(${scale})`,
              ...pageStyleBackground(canvas.pageStyle, canvas.background),
            }}
          >
            {canvas.elements.map((el) => (
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
    </div>
  );
}
