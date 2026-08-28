import { Fragment, type ReactNode } from "react";
import { ImageIcon, Volume2, MoveHorizontal, ListOrdered, LayoutGrid, Brain, SearchCheck, ScanSearch, Repeat2, Pencil, PenLine, ThumbsUp, ThumbsDown, Layers2, ArrowRight, Grid2x2, Shuffle, Blocks, Images, Columns2, KeyRound } from "lucide-react";
import type { CanvasElement } from "@/lib/types/canvas";
import { memoryPairFaces } from "@/lib/types/canvas";
import { ListBlock, WritingLinesBlock, ChecklistBlock, TableBlock, ArrowBlock, DividerBlock, StickerBlock, SpeechBubbleBlock, CalloutBlock, SheetHeaderBlock, LetterBoxesBlock, NumberLineBlock, RewardStarsBlock, WordBankBlock } from "@/components/canvas/worksheet-elements";
import { tokenizeWordHunt, targetTokenIndices } from "@/lib/canvas/word-hunt";
import { textStyle, cardStyle, imageStyle, imagePx, mcGridStyle } from "@/lib/canvas/appearance";
import { buildWordSearch } from "@/lib/canvas/word-search";
import { HotspotFrame } from "./hotspot-frame";
import { OptionPicture } from "./option-picture";
import { cn } from "@/lib/utils";

// Static, non-interactive rendering of a canvas element — used by the
// authoring canvas. The activity player has its own interactive renderer.
//
// hotspotOverlay lets the caller put its own target markers inside the
// picture frame instead of the static ones drawn here — ElementBox passes the
// draggable editor while the element is selected. It has to go *inside* the
// frame rather than over the whole element: the frame is only as big as the
// rendered picture, so an overlay positioned against the element would put
// targets somewhere else entirely from where the patient sees them.
// hideAnswers strips the answer key from the types that show it. On the
// authoring canvas revealing the correct option is the point — the clinician
// is checking their own work. On a sheet printed for a patient it hands them
// the answers, so the print view sets this.
export function ElementPreview({
  element,
  hotspotOverlay,
  hideAnswers = false,
}: {
  element: CanvasElement;
  hotspotOverlay?: ReactNode;
  hideAnswers?: boolean;
}) {
  switch (element.type) {
    case "text":
      return (
        <div
          className="flex size-full items-center overflow-hidden px-1"
          style={{
            fontSize: element.fontSize,
            fontWeight: element.fontWeight === "bold" ? 700 : element.fontWeight === "medium" ? 500 : 400,
            color: element.color,
            fontStyle: element.italic ? "italic" : undefined,
            textDecoration: element.underline ? "underline" : undefined,
            textAlign: element.align,
            justifyContent:
              element.align === "center" ? "center" : element.align === "right" ? "flex-end" : "flex-start",
          }}
        >
          <span className="w-full whitespace-pre-wrap break-words">{element.content}</span>
        </div>
      );

    case "image":
      return element.src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={element.src}
          alt={element.alt}
          className="size-full"
          style={{ objectFit: element.objectFit, borderRadius: element.radius }}
        />
      ) : (
        <div
          className="flex size-full flex-col items-center justify-center gap-1 border border-dashed border-border bg-muted text-muted-foreground"
          style={{ borderRadius: element.radius }}
        >
          <ImageIcon className="size-6" />
          <span className="text-xs">No image set</span>
        </div>
      );

    case "shape":
      return (
        <div
          className="size-full"
          style={{
            backgroundColor: element.fill,
            border: `${element.strokeWidth}px solid ${element.stroke}`,
            borderRadius: element.shape === "circle" ? "9999px" : element.shape === "rectangle" ? 12 : 12,
            clipPath: element.shape === "star" ? "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)" : undefined,
          }}
        />
      );

    case "audio":
      return (
        <div className="flex size-full items-center gap-2 rounded-lg border border-border bg-card px-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
            <Volume2 className="size-4" />
          </span>
          <span className="truncate text-sm font-medium">{element.label || "Audio clip"}</span>
        </div>
      );

    case "button":
      return (
        <button
          type="button"
          className={cn(
            "flex size-full items-center justify-center rounded-md text-sm font-semibold pointer-events-none",
            element.style === "primary" && "bg-primary text-primary-foreground",
            element.style === "secondary" && "bg-secondary text-secondary-foreground",
            element.style === "accent" && "bg-accent text-accent-foreground",
          )}
        >
          {element.label}
        </button>
      );

    case "multipleChoice": {
      // A picture-choice question lays its answers out side by side, with the
      // photograph as the answer rather than a thumbnail next to the words.
      const grid = element.layout === "grid";
      return (
        <div
          className="flex size-full flex-col gap-2 overflow-hidden rounded-lg border border-border bg-card p-3"
          style={cardStyle(element)}
        >
          <p className="font-semibold" style={textStyle(element)}>{element.prompt}</p>
          <div
            className={cn(
              "flex-1 overflow-hidden",
              grid ? "grid content-start gap-2" : "flex flex-col gap-1.5",
            )}
            style={{ ...textStyle(element), ...(grid ? mcGridStyle(element) : {}) }}
          >
            {element.options.map((o) => (
              <div
                key={o.id}
                className={cn(
                  "min-w-0 rounded-md border",
                  grid
                    ? "flex flex-col items-center gap-1.5 p-2 text-center"
                    : "flex items-center gap-1.5 px-2 py-1",
                  o.correct && !hideAnswers
                    ? "border-success/40 bg-success/10 text-success"
                    : "border-border",
                )}
              >
                <OptionPicture element={element} option={o} grid={grid} />
                <span className={cn("truncate", grid && "w-full")}>{o.label}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    case "fillBlank":
      return (
        <div
          className="flex size-full flex-col justify-center gap-1 rounded-lg border border-border bg-card p-3"
          style={cardStyle(element)}
        >
          <p style={textStyle(element)}>
            {element.template.split("___").map((part, i, arr) => (
              <span key={i}>
                {part}
                {i < arr.length - 1 && (
                  <span className="mx-1 inline-block w-16 border-b-2 border-dashed border-primary align-middle" />
                )}
              </span>
            ))}
          </p>
          {!hideAnswers && (
            <p className="text-xs text-muted-foreground">Answer: {element.answer}</p>
          )}
        </div>
      );

    case "dragMatch":
      return (
        <div
          className="flex size-full flex-col gap-2 overflow-hidden rounded-lg border border-border bg-card p-3"
          style={cardStyle(element)}
        >
          <div className="flex items-center gap-1.5 font-semibold" style={textStyle(element)}>
            <MoveHorizontal className="size-3.5 shrink-0" /> {element.prompt}
          </div>
          {/* One grid, cells interleaved, so each pair sits on a shared row
              whatever height its photo forces — two independently stacked
              columns drifted out of alignment as soon as one side had an
              image and the other did not.

              Deliberately NOT shuffled here, unlike the player: this is the
              clinician checking their answer key, and they need to see which
              left item is supposed to go with which right one. */}
          <div
            className="grid flex-1 auto-rows-min grid-cols-2 gap-x-2 gap-y-1 overflow-hidden"
            style={textStyle(element)}
          >
            {element.pairs.map((p) => (
              <Fragment key={p.id}>
                <div className="flex min-w-0 items-center gap-1.5 rounded-md border border-border px-2 py-1">
                  {p.leftImage && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.leftImage} alt="" className="shrink-0 rounded object-cover" style={imageStyle(element)} />
                  )}
                  <span className="truncate">{p.left}</span>
                </div>
                <div className="flex min-w-0 items-center gap-1.5 rounded-md border border-border bg-secondary px-2 py-1">
                  {p.rightImage && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.rightImage} alt="" className="shrink-0 rounded object-cover" style={imageStyle(element)} />
                  )}
                  <span className="truncate">{p.right}</span>
                </div>
              </Fragment>
            ))}
          </div>
        </div>
      );

    case "sequence":
      return (
        <div
          className="flex size-full flex-col gap-2 overflow-hidden rounded-lg border border-border bg-card p-3"
          style={cardStyle(element)}
        >
          <div className="flex items-center gap-1.5 font-semibold" style={textStyle(element)}>
            <ListOrdered className="size-3.5 shrink-0" /> {element.prompt}
          </div>
          <div className="flex flex-col gap-1 overflow-hidden" style={textStyle(element)}>
            {[...element.items]
              .sort((a, b) => a.order - b.order)
              .map((it, i) => (
                <div
                  key={it.id}
                  className="flex min-w-0 items-center gap-2 rounded-md border border-border px-2 py-1"
                >
                  {/* The number IS the answer to a sequencing task, so on a
                      printed sheet it becomes an empty box to write in. */}
                  <span className="shrink-0 font-semibold text-primary">
                    {hideAnswers ? "☐" : `${i + 1}.`}
                  </span>
                  {it.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={it.image}
                      alt=""
                      className="shrink-0 rounded object-cover"
                      style={imageStyle(element)}
                    />
                  )}
                  <span className="truncate">{it.label}</span>
                </div>
              ))}
          </div>
        </div>
      );

    case "sortCategorize":
      return (
        <div
          className="flex size-full flex-col gap-2 overflow-hidden rounded-lg border border-border bg-card p-3"
          style={cardStyle(element)}
        >
          <div className="flex items-center gap-1.5 font-semibold" style={textStyle(element)}>
            <LayoutGrid className="size-3.5 shrink-0" /> {element.prompt}
          </div>
          <div
            className="grid flex-1 gap-2 overflow-hidden"
            style={{
              ...textStyle(element),
              gridTemplateColumns: `repeat(${element.categories.length}, minmax(0, 1fr))`,
            }}
          >
            {element.categories.map((c) => (
              <div key={c.id} className="flex flex-col gap-1 overflow-hidden">
                <p className="truncate font-semibold text-muted-foreground">{c.label}</p>
                {/* Grouping each item under its own category is the answer
                    key; a printed sheet shows empty columns to write into. */}
                {element.items
                  .filter((it) => (hideAnswers ? false : it.categoryId === c.id))
                  .map((it) => (
                    <div
                      key={it.id}
                      className="flex items-center gap-1.5 truncate rounded-md border border-border px-2 py-1"
                      style={textStyle(element)}
                    >
                      {it.image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={it.image}
                          alt=""
                          className="shrink-0 rounded object-cover"
                          style={imageStyle(element)}
                        />
                      )}
                      <span className="truncate">{it.label}</span>
                    </div>
                  ))}
              </div>
            ))}
          </div>
        </div>
      );

    case "memoryMatch":
      return (
        <div
          className="flex size-full flex-col gap-2 overflow-hidden rounded-lg border border-border bg-card p-3"
          style={cardStyle(element)}
        >
          <div className="flex items-center gap-1.5 font-semibold" style={textStyle(element)}>
            <Brain className="size-3.5 shrink-0" /> {element.prompt}
          </div>
          {/* Shows both faces of every pair, bracketed together. The patient
              sees these shuffled and face-down; this view exists so the
              clinician can check what actually matches what — which is
              impossible to see if only one face of each pair is drawn. */}
          <div className="grid flex-1 grid-cols-2 gap-1.5 overflow-hidden" style={textStyle(element)}>
            {element.pairs.map((p) => {
              const { a, b } = memoryPairFaces(p);
              return (
                <div
                  key={p.id}
                  className="flex min-w-0 items-center gap-1 rounded-md border border-dashed border-border p-1"
                >
                  {[a, b].map((face, i) => (
                    <div
                      key={i}
                      className="flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded border border-border px-1 py-1 text-center"
                    >
                      {face.image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={face.image}
                          alt=""
                          className="max-w-full rounded object-cover"
                          style={imageStyle(element)}
                        />
                      )}
                      <span className="w-full truncate">{face.label}</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      );

    case "wordHunt": {
      const tokens = tokenizeWordHunt(element.passage);
      const targets = targetTokenIndices(tokens, element.targetWords);
      return (
        <div
          className="flex size-full flex-col gap-2 overflow-hidden rounded-lg border border-border bg-card p-3"
          style={cardStyle(element)}
        >
          <div className="flex items-center gap-1.5 font-semibold" style={textStyle(element)}>
            <SearchCheck className="size-3.5 shrink-0" /> {element.prompt}
          </div>
          <p className="overflow-hidden leading-relaxed text-muted-foreground" style={textStyle(element)}>
            {tokens.map((token, i) =>
              targets.has(i) && !hideAnswers ? (
                <span key={i} className="rounded bg-success/20 px-0.5 text-success">
                  {token}
                </span>
              ) : (
                <span key={i}>{token}</span>
              ),
            )}
          </p>
        </div>
      );
    }

    case "imageHotspots":
      return (
        <div
          className="flex size-full flex-col gap-2 overflow-hidden rounded-lg border border-border bg-card p-3"
          style={cardStyle(element)}
        >
          <div className="flex items-center gap-1.5 font-semibold" style={textStyle(element)}>
            <ScanSearch className="size-3.5 shrink-0" /> {element.prompt}
          </div>
          {/* In the authoring view every target is outlined and labelled
              regardless of the element's showOutlines setting — the clinician
              is checking placement, and an authoring view that hid the targets
              would be impossible to work in.

              On a sheet handed to a patient (hideAnswers) those boxes are the
              answer key drawn on top of the question, so they come off. The
              target names move to a "Find:" line instead — without them the
              printed picture asks nothing at all.

              hotspotOverlay replaces these with the caller's own draggable
              ones (ElementBox passes HotspotEditor while selected), rendered
              inside this same frame so the two agree on where 50% is. */}
          <HotspotFrame element={element} emptyHint="Add a picture in the panel">
            {hideAnswers
              ? null
              : (hotspotOverlay ??
                element.hotspots.map((h) => (
                  <div
                    key={h.id}
                    className="absolute rounded-md border-2 border-primary/70 bg-primary/10"
                    style={{
                      left: `${h.xPct}%`,
                      top: `${h.yPct}%`,
                      width: `${h.wPct}%`,
                      height: `${h.hPct}%`,
                    }}
                  >
                    <span className="absolute inset-x-0 bottom-0 truncate bg-primary/80 px-1 text-[10px] text-primary-foreground">
                      {h.label}
                    </span>
                  </div>
                )))}
          </HotspotFrame>
          {hideAnswers && element.hotspots.length > 0 && (
            <p className="shrink-0 truncate text-muted-foreground" style={textStyle(element)}>
              Find: {element.hotspots.map((h) => h.label).join(", ")}
            </p>
          )}
        </div>
      );

    case "practiceDrill":
      return (
        <div
          className="flex size-full flex-col gap-2 overflow-hidden rounded-lg border border-border bg-card p-3"
          style={cardStyle(element)}
        >
          <div className="flex items-center gap-1.5 font-semibold" style={textStyle(element)}>
            <Repeat2 className="size-3.5 shrink-0" /> {element.prompt}
          </div>
          <div className="flex flex-col gap-1 overflow-hidden" style={textStyle(element)}>
            {element.words.map((w) => (
              <div
                key={w.id}
                className="flex min-w-0 items-center gap-2 rounded-md border border-border px-2 py-1"
              >
                {w.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={w.image} alt="" className="shrink-0 rounded object-cover" style={imageStyle(element)} />
                )}
                <span className="min-w-0 flex-1 truncate">{w.label}</span>
                <span className="flex shrink-0 items-center gap-1">
                  {Array.from({ length: w.target }, (_, i) => (
                    <span key={i} className="size-2 rounded-full bg-muted-foreground/25" />
                  ))}
                </span>
              </div>
            ))}
          </div>
        </div>
      );

    // Both new types are unmarked — a drawing and a written answer have no
    // key — so the authoring view and the printed sheet are the same thing:
    // an empty space for the patient to fill. That means no hideAnswers
    // branch here, and it means the printed version is genuinely usable
    // rather than a picture of a screen.
    case "drawPad":
      return (
        <div
          className="flex size-full flex-col gap-2 overflow-hidden rounded-lg border border-border bg-card p-3"
          style={cardStyle(element)}
        >
          <div className="flex items-center gap-1.5 font-semibold" style={textStyle(element)}>
            <Pencil className="size-3.5 shrink-0" /> {element.prompt}
          </div>
          <div className="relative min-h-0 flex-1 overflow-hidden rounded-md border border-dashed border-border bg-white">
            {element.backgroundSrc && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={element.backgroundSrc}
                alt=""
                className="absolute inset-0 size-full object-contain opacity-40"
              />
            )}
          </div>
        </div>
      );

    case "longAnswer":
      return (
        <div
          className="flex size-full flex-col gap-2 overflow-hidden rounded-lg border border-border bg-card p-3"
          style={cardStyle(element)}
        >
          <div className="flex items-center gap-1.5 font-semibold" style={textStyle(element)}>
            <PenLine className="size-3.5 shrink-0" /> {element.prompt}
          </div>
          {/* Ruled lines rather than an empty rectangle: this is where the
              answer gets written by hand on paper, and unruled space is
              where handwriting wanders. */}
          <div className="flex min-h-0 flex-1 flex-col justify-evenly overflow-hidden">
            {Array.from({ length: Math.max(1, element.lines) }, (_, i) => (
              <span key={i} className="block border-b border-border/70" />
            ))}
          </div>
        </div>
      );

    // The three simple tasks. All show the answer key on the authoring canvas
    // and drop it under hideAnswers, same rule as every other scored type.
    case "yesNo":
      return (
        <div
          className="flex size-full flex-col gap-2 overflow-hidden rounded-lg border border-border bg-card p-3"
          style={cardStyle(element)}
        >
          <p className="shrink-0 text-center font-semibold" style={textStyle(element)}>
            {element.prompt}
          </p>
          {element.imageSrc && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={element.imageSrc} alt="" className="min-h-0 w-full flex-1 rounded-md object-contain" />
          )}
          <div className="grid shrink-0 grid-cols-2 gap-2" style={textStyle(element)}>
            {(["yes", "no"] as const).map((side) => (
              <div
                key={side}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-xl border-2 py-3 font-semibold",
                  element.answer === side && !hideAnswers
                    ? "border-success/50 bg-success/10 text-success"
                    : "border-border",
                )}
              >
                {side === "yes" ? <ThumbsUp className="size-4" /> : <ThumbsDown className="size-4" />}
                {side === "yes" ? element.yesLabel : element.noLabel}
              </div>
            ))}
          </div>
        </div>
      );

    case "flashcards":
      return (
        <div
          className="flex size-full flex-col gap-2 overflow-hidden rounded-lg border border-border bg-card p-3"
          style={cardStyle(element)}
        >
          <div className="flex shrink-0 items-center gap-1.5 font-semibold" style={textStyle(element)}>
            <Layers2 className="size-3.5 shrink-0" /> {element.prompt}
          </div>
          {/* Both faces of every card, which is the one thing the player
              cannot show — it turns one card at a time — and exactly what a
              clinician checking the deck needs to see. */}
          <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-hidden" style={textStyle(element)}>
            {element.cards.map((c) => (
              <div key={c.id} className="flex min-w-0 items-center gap-1.5 rounded-md border border-border px-2 py-1">
                <span className="min-w-0 flex-1 truncate">{c.front}</span>
                <ArrowRight className="size-3 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate text-muted-foreground">{c.back}</span>
              </div>
            ))}
          </div>
        </div>
      );

    case "countTap":
      return (
        <div
          className="flex size-full flex-col gap-2 overflow-hidden rounded-lg border border-border bg-card p-3"
          style={cardStyle(element)}
        >
          <p className="shrink-0 text-center font-semibold" style={textStyle(element)}>
            {element.prompt}
          </p>
          <div className="flex min-h-0 flex-1 flex-wrap items-center justify-center gap-1.5 overflow-hidden">
            {Array.from({ length: Math.max(0, Math.min(20, Math.round(element.count))) }, (_, i) =>
              element.imageSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={element.imageSrc} alt="" className="rounded object-cover" style={imageStyle(element)} />
              ) : (
                <span key={i} className="text-2xl leading-none">{element.emoji}</span>
              ),
            )}
          </div>
          <div className="flex shrink-0 flex-wrap justify-center gap-1.5">
            {Array.from(
              { length: Math.max(Math.round(element.count), Math.min(10, Math.round(element.maxChoice) || 5)) },
              (_, i) => i + 1,
            ).map((n) => (
              <span
                key={n}
                className={cn(
                  "flex size-8 items-center justify-center rounded-lg border-2 text-sm font-bold",
                  n === element.count && !hideAnswers
                    ? "border-success/50 bg-success/10 text-success"
                    : "border-border",
                )}
              >
                {n}
              </span>
            ))}
          </div>
        </div>
      );

    case "wordSearch": {
      // The same grid the patient will see, built from the same seed, so the
      // clinician is checking the real board rather than an impression of one.
      const grid = buildWordSearch(element.words, element.size, element.id);
      const solved = new Set<string>();
      if (!hideAnswers) {
        for (const p of grid.placements) {
          for (let i = 0; i < p.word.length; i++) {
            solved.add(`${p.row + p.dRow * i}:${p.col + p.dCol * i}`);
          }
        }
      }
      return (
        <div
          className="flex size-full flex-col gap-2 overflow-hidden rounded-lg border border-border bg-card p-3"
          style={cardStyle(element)}
        >
          <div className="flex items-center gap-1.5 font-semibold" style={textStyle(element)}>
            <Grid2x2 className="size-3.5 shrink-0" /> {element.prompt}
          </div>
          <div
            className="grid min-h-0 flex-1 gap-px text-[10px]"
            style={{ gridTemplateColumns: `repeat(${grid.size}, minmax(0, 1fr))` }}
          >
            {grid.cells.map((row, r) =>
              row.map((letter, c) => (
                <span
                  key={`${r}:${c}`}
                  className={cn(
                    "flex items-center justify-center rounded-sm font-semibold uppercase",
                    // On the canvas the placed words are highlighted so the
                    // author can see where they landed; on paper that would
                    // be the answer key printed on the puzzle.
                    solved.has(`${r}:${c}`) ? "bg-success/25 text-success" : "bg-muted/50",
                  )}
                >
                  {letter}
                </span>
              )),
            )}
          </div>
          <p className="shrink-0 truncate text-muted-foreground" style={textStyle(element)}>
            Find: {grid.placements.map((p) => p.word).join(", ")}
          </p>
        </div>
      );
    }

    case "unscramble":
      return (
        <div
          className="flex size-full flex-col gap-2 overflow-hidden rounded-lg border border-border bg-card p-3"
          style={cardStyle(element)}
        >
          <div className="flex items-center gap-1.5 font-semibold" style={textStyle(element)}>
            <Shuffle className="size-3.5 shrink-0" /> {element.prompt}
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-hidden" style={textStyle(element)}>
            {element.words.map((w) => (
              <div key={w.id} className="flex min-w-0 items-center gap-2">
                <span className="flex flex-wrap gap-1">
                  {[...w.word.toUpperCase()].map((ch, i) => (
                    <span key={i} className="rounded border border-border px-1.5 py-0.5 font-semibold">
                      {ch}
                    </span>
                  ))}
                </span>
                {!hideAnswers && (
                  <span className="truncate text-muted-foreground">= {w.word}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      );

    case "wordChunks":
      return (
        <div
          className="flex size-full flex-col gap-2 overflow-hidden rounded-lg border border-border bg-card p-3"
          style={cardStyle(element)}
        >
          <div className="flex items-center gap-1.5 font-semibold" style={textStyle(element)}>
            <Blocks className="size-3.5 shrink-0" /> {element.prompt}
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-hidden" style={textStyle(element)}>
            {element.items.map((it) => (
              <div key={it.id} className="flex min-w-0 items-center gap-2">
                <span className="flex flex-wrap gap-1">
                  {it.chunks.map((c, i) => (
                    <span key={i} className="rounded border border-border px-1.5 py-0.5 font-semibold">
                      {c}
                    </span>
                  ))}
                </span>
                {!hideAnswers && <span className="truncate text-muted-foreground">= {it.word}</span>}
              </div>
            ))}
          </div>
        </div>
      );

    case "photoHunt":
      return (
        <div
          className="flex size-full flex-col gap-2 overflow-hidden rounded-lg border border-border bg-card p-3"
          style={cardStyle(element)}
        >
          <div className="flex items-center gap-1.5 font-semibold" style={textStyle(element)}>
            <Images className="size-3.5 shrink-0" /> {element.prompt}
          </div>
          <div
            className="grid min-h-0 flex-1 content-start gap-1.5 overflow-hidden"
            style={{
              ...textStyle(element),
              gridTemplateColumns: `repeat(${Math.max(1, Math.min(element.columns || 4, element.items.length || 1))}, minmax(0, 1fr))`,
            }}
          >
            {element.items.map((it) => (
              <div
                key={it.id}
                className={cn(
                  "flex min-w-0 flex-col items-center gap-0.5 rounded-md border p-1.5 text-center",
                  it.isTarget && !hideAnswers
                    ? "border-success/50 bg-success/10 text-success"
                    : "border-border",
                )}
              >
                {it.imageSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={it.imageSrc} alt="" className="w-full rounded object-cover" style={{ height: imagePx(element) }} />
                ) : (
                  <span className="leading-none" style={{ fontSize: imagePx(element) }}>{it.emoji || "🔲"}</span>
                )}
                <span className="w-full truncate">{it.label}</span>
              </div>
            ))}
          </div>
        </div>
      );

    case "sideBySide":
      return (
        <div
          className="flex size-full flex-col gap-2 overflow-hidden rounded-lg border border-border bg-card p-3"
          style={cardStyle(element)}
        >
          <div className="flex items-center gap-1.5 font-semibold" style={textStyle(element)}>
            <Columns2 className="size-3.5 shrink-0" /> {element.prompt}
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden" style={textStyle(element)}>
            {element.rounds.map((r) => (
              <div key={r.id} className="flex flex-col gap-1">
                <p className="truncate">{r.question}</p>
                <div className="grid grid-cols-2 gap-2">
                  {(["a", "b"] as const).map((side) => (
                    <div
                      key={side}
                      className={cn(
                        "flex min-w-0 flex-col items-center gap-0.5 rounded-md border p-1.5 text-center",
                        r.answer === side && !hideAnswers
                          ? "border-success/50 bg-success/10 text-success"
                          : "border-border",
                      )}
                    >
                      {r[side].imageSrc ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={r[side].imageSrc} alt="" className="w-full rounded object-cover" style={{ height: imagePx(element) }} />
                      ) : (
                        <span className="leading-none" style={{ fontSize: imagePx(element) }}>{r[side].emoji || "🔲"}</span>
                      )}
                      <span className="w-full truncate">{r[side].label}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      );

    case "secretWord":
      return (
        <div
          className="flex size-full flex-col gap-2 overflow-hidden rounded-lg border border-border bg-card p-3"
          style={cardStyle(element)}
        >
          <div className="flex items-center gap-1.5 font-semibold" style={textStyle(element)}>
            <KeyRound className="size-3.5 shrink-0" /> {element.prompt}
          </div>
          {element.hint && (
            <p className="truncate text-muted-foreground" style={textStyle(element)}>
              Clue: {element.hint}
            </p>
          )}
          <div className="flex flex-wrap justify-center gap-1.5">
            {[...element.word.toUpperCase()].map((ch, i) => (
              <span
                key={i}
                className={cn(
                  "flex size-9 items-center justify-center rounded border-b-4 border-border text-lg font-bold",
                  // The word IS the answer, so a printed sheet shows blanks.
                  hideAnswers && "text-transparent",
                )}
              >
                {ch}
              </span>
            ))}
          </div>
        </div>
      );

    case "list":
      return <ListBlock element={element} />;

    case "writingLines":
      return <WritingLinesBlock element={element} />;

    case "checklist":
      return <ChecklistBlock element={element} />;

    case "table":
      return <TableBlock element={element} />;

    // Page furniture. Unscored, so the same block serves the authoring
    // canvas, the player and the printed sheet — the print output cannot
    // drift from what the author saw.
    case "arrow":
      return <ArrowBlock element={element} />;

    case "divider":
      return <DividerBlock element={element} />;

    case "sticker":
      return <StickerBlock element={element} />;

    case "speechBubble":
      return <SpeechBubbleBlock element={element} />;

    case "callout":
      return <CalloutBlock element={element} />;

    case "sheetHeader":
      return <SheetHeaderBlock element={element} />;

    case "letterBoxes":
      return <LetterBoxesBlock element={element} />;

    case "numberLine":
      return <NumberLineBlock element={element} />;

    case "rewardStars":
      return <RewardStarsBlock element={element} />;

    case "wordBank":
      return <WordBankBlock element={element} />;

    default:
      return null;
  }
}
