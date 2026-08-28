"use client";

import { useState } from "react";
import { ChevronDown, Check, X, CircleDot, Minus } from "lucide-react";
import { getAttemptReview } from "@/lib/actions/attempts";
import type { ReviewDrawing, ReviewItem, ReviewStatus } from "@/lib/review";
import { cn } from "@/lib/utils";

// The per-question breakdown of one attempt, opened on demand.
//
// Collapsed by default and fetched on first open: the breakdown needs the
// whole activity as it was assigned, which is far more data than the row it
// sits under. A clinician scanning a list of scores pays nothing for it.

const STATUS: Record<
  ReviewStatus,
  { label: string; icon: typeof Check; className: string }
> = {
  correct: { label: "Correct", icon: Check, className: "text-success" },
  // accent, not a warning colour — the palette has no warning token, and the
  // status is never carried by colour alone anyway: every row has an icon and
  // a word as well.
  partial: { label: "Partly correct", icon: CircleDot, className: "text-accent" },
  incorrect: { label: "Incorrect", icon: X, className: "text-destructive" },
  unanswered: { label: "Not answered", icon: Minus, className: "text-muted-foreground" },
  unscored: { label: "Not marked", icon: Minus, className: "text-muted-foreground" },
};

export function AttemptReview({
  attemptId,
  answeredLabel = "Patient answered",
}: {
  attemptId: string;
  // A parent reads this about their own child, where "Patient answered" is
  // both cold and slightly wrong. The caller passes the name it should use.
  answeredLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<ReviewItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (!next || items || loading) return;

    setLoading(true);
    const result = await getAttemptReview(attemptId);
    setLoading(false);
    if (result.error) setError(result.error);
    else setItems(result.items ?? []);
  };

  return (
    <div>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="flex min-h-11 w-fit cursor-pointer items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
        {open ? "Hide answers" : "See every answer"}
      </button>

      {open && (
        <div className="mt-2">
          {loading && <p className="text-xs text-muted-foreground">Loading answers…</p>}
          {error && <p className="text-xs text-destructive">{error}</p>}
          {items?.length === 0 && (
            <p className="text-xs text-muted-foreground">
              This activity had no questions to answer.
            </p>
          )}
          {items && items.length > 0 && (
            <AttemptReviewList items={items} answeredLabel={answeredLabel} />
          )}
        </div>
      )}
    </div>
  );
}

// The rows themselves, separated from the fetching around them so the same
// markup can be rendered from any source of ReviewItems.
export function AttemptReviewList({
  items,
  answeredLabel = "Patient answered",
}: {
  items: ReviewItem[];
  answeredLabel?: string;
}) {
  return (
    <ol className="flex flex-col gap-3">
      {items.map((item) => (
        <ReviewRow key={item.elementId} item={item} answeredLabel={answeredLabel} />
      ))}
    </ol>
  );
}

function ReviewRow({ item, answeredLabel }: { item: ReviewItem; answeredLabel: string }) {
  const status = STATUS[item.status];
  const Icon = status.icon;
  // Only worth showing the key when the patient did not match it — repeating
  // the right answer under a correct answer is noise on every row.
  const showExpected = item.expected.length > 0 && item.status !== "correct";

  return (
    <li className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">
            {item.position}. {item.typeLabel}
          </p>
          {item.prompt && <p className="text-sm font-medium">{item.prompt}</p>}
        </div>
        <p className={cn("flex shrink-0 items-center gap-1 text-xs font-medium", status.className)}>
          <Icon className="size-3.5" aria-hidden />
          {status.label}
          {/* The count only means something when there was more than one mark
              to get — "1/1 correct" next to "Correct" says nothing twice. */}
          {item.total > 1 && (
            <span className="text-muted-foreground">
              {item.correct}/{item.total}
            </span>
          )}
        </p>
      </div>

      <dl className="mt-2 grid gap-1 text-xs sm:grid-cols-[7rem_1fr]">
        <dt className="text-muted-foreground">{answeredLabel}</dt>
        <dd className={cn(item.given.length === 0 && "text-muted-foreground")}>
          {item.drawing ? (
            <DrawingReplay drawing={item.drawing} caption={item.given[0]} />
          ) : item.given.length === 0 ? (
            "Nothing"
          ) : (
            <Lines lines={item.given} />
          )}
        </dd>

        {showExpected && (
          <>
            <dt className="text-muted-foreground">Correct answer</dt>
            <dd>
              <Lines lines={item.expected} />
            </dd>
          </>
        )}
      </dl>
    </li>
  );
}

// The patient's own strokes, drawn again.
//
// The pad is a square in normalised space, so the viewBox is 0 0 100 100 and
// every stored point is simply multiplied by 100 — no layout measurement, no
// ResizeObserver, and it stays sharp at whatever size the row happens to be.
// vectorEffect keeps the pen the same visual weight however the SVG is
// scaled, which is what makes a light pencil line still look light here.
function DrawingReplay({ drawing, caption }: { drawing: ReviewDrawing; caption?: string }) {
  const path = (stroke: { x: number; y: number }[]) =>
    stroke.map((p) => `${(p.x * 100).toFixed(2)},${(p.y * 100).toFixed(2)}`).join(" ");

  return (
    <figure className="flex flex-col gap-1">
      <svg
        viewBox="0 0 100 100"
        className="w-32 max-w-full rounded-md border border-border bg-white"
        role="img"
        aria-label={
          drawing.glyph
            ? `The patient's attempt at tracing ${drawing.glyph}`
            : "The patient's drawing"
        }
      >
        {/* The letter they were tracing over, faint, so the clinician judges
            the stroke against the target rather than in isolation. */}
        {drawing.glyph && (
          <text
            x="50"
            y="50"
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="72"
            fill="#e5e7eb"
          >
            {drawing.glyph}
          </text>
        )}
        {drawing.strokes.map((stroke, i) => (
          <polyline
            key={i}
            points={path(stroke)}
            fill="none"
            stroke={drawing.strokeColor}
            strokeWidth={drawing.strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
      {caption && <figcaption className="text-muted-foreground">{caption}</figcaption>}
    </figure>
  );
}

// One answer per line rather than a comma-joined run: a drag-to-match with
// six pairs is six observations, and running them together makes the one that
// went wrong hard to pick out.
function Lines({ lines }: { lines: string[] }) {
  if (lines.length === 1) return <span className="whitespace-pre-wrap">{lines[0]}</span>;
  return (
    <ul className="flex flex-col gap-0.5">
      {lines.map((line, i) => (
        <li key={i} className="whitespace-pre-wrap">
          {line}
        </li>
      ))}
    </ul>
  );
}
