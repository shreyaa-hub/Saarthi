"use client";

import { Fragment, useMemo, useState } from "react";
import { Volume2, Check, X, Brain, Plus, Minus } from "lucide-react";
import type { CanvasElement } from "@/lib/types/canvas";
import { memoryPairFaces } from "@/lib/types/canvas";
import { isElementCorrect } from "@/lib/scoring";
import { ListBlock, WritingLinesBlock } from "@/components/canvas/worksheet-elements";
import { seededShuffle } from "@/lib/canvas/shuffle";
import { tokenizeWordHunt, isWordToken, targetTokenIndices } from "@/lib/canvas/word-hunt";
import { textStyle, cardStyle, imageStyle } from "@/lib/canvas/appearance";
import { HotspotFrame } from "@/components/canvas/hotspot-frame";
import { cn } from "@/lib/utils";

export function ElementPlayer({
  element,
  response,
  onChange,
  locked,
  onSubmit,
}: {
  element: CanvasElement;
  response: unknown;
  onChange: (value: unknown) => void;
  locked: boolean;
  onSubmit: () => void;
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
      ) : null;

    case "shape":
      return (
        <div
          className="size-full"
          style={{
            backgroundColor: element.fill,
            border: `${element.strokeWidth}px solid ${element.stroke}`,
            borderRadius: element.shape === "circle" ? "9999px" : 12,
          }}
        />
      );

    case "audio":
      return (
        <div className="flex size-full items-center gap-2 rounded-lg border border-border bg-card px-3">
          <Volume2 className="size-4 text-primary" />
          <span className="text-sm font-medium">{element.label}</span>
          {element.src && <audio controls src={element.src} className="h-8 flex-1" />}
        </div>
      );

    case "button":
      return (
        <button
          type="button"
          onClick={onSubmit}
          className={cn(
            "flex size-full items-center justify-center rounded-md text-sm font-semibold transition-opacity hover:opacity-90 cursor-pointer",
            element.style === "primary" && "bg-primary text-primary-foreground",
            element.style === "secondary" && "bg-secondary text-secondary-foreground",
            element.style === "accent" && "bg-accent text-accent-foreground",
          )}
        >
          {element.label}
        </button>
      );

    case "multipleChoice": {
      const selected = new Set(Array.isArray(response) ? (response as string[]) : []);
      const toggle = (optionId: string) => {
        if (locked) return;
        const next = new Set(selected);
        if (element.allowMultiple) {
          if (next.has(optionId)) next.delete(optionId);
          else next.add(optionId);
        } else {
          next.clear();
          next.add(optionId);
        }
        onChange([...next]);
      };
      return (
        <div
          className="flex size-full flex-col gap-2 overflow-auto rounded-lg border border-border bg-card p-3"
          style={cardStyle(element)}
        >
          <p className="font-semibold" style={textStyle(element)}>
            {element.prompt}
          </p>
          <div className="flex flex-1 flex-col gap-1.5">
            {element.options.map((o) => {
              const isSelected = selected.has(o.id);
              const showResult = locked;
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => toggle(o.id)}
                  disabled={locked}
                  style={textStyle(element)}
                  className={cn(
                    "flex items-center justify-between rounded-md border px-3 py-2 text-left transition-colors",
                    isSelected ? "border-primary bg-secondary" : "border-border hover:bg-muted",
                    showResult && o.correct && "border-success bg-success/10",
                    showResult && isSelected && !o.correct && "border-destructive bg-destructive/10",
                  )}
                >
                  {o.label}
                  {showResult && o.correct && <Check className="size-4 text-success" />}
                  {showResult && isSelected && !o.correct && <X className="size-4 text-destructive" />}
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    case "fillBlank": {
      const value = typeof response === "string" ? response : "";
      const correct = locked && isElementCorrect(element, value);
      const parts = element.template.split("___");
      return (
        <div className="flex size-full flex-col justify-center gap-2 rounded-lg border border-border bg-card p-3">
          <p className="flex flex-wrap items-center gap-1 text-sm">
            {parts.map((part, i) => (
              <span key={i} className="flex items-center gap-1">
                {part}
                {i < parts.length - 1 && (
                  <input
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    disabled={locked}
                    className={cn(
                      "w-24 border-b-2 bg-transparent px-1 text-center outline-none",
                      locked ? (correct ? "border-success text-success" : "border-destructive text-destructive") : "border-primary",
                    )}
                  />
                )}
              </span>
            ))}
            {locked && (correct ? <Check className="size-4 text-success" /> : <X className="size-4 text-destructive" />)}
          </p>
        </div>
      );
    }

    case "dragMatch": {
      const pairs = (response ?? {}) as Record<string, string>;
      return <DragMatchPlayer element={element} pairs={pairs} onChange={onChange} locked={locked} />;
    }

    case "sequence": {
      const order = Array.isArray(response) ? (response as string[]) : [];
      return <SequencePlayer element={element} order={order} onChange={onChange} locked={locked} />;
    }

    case "sortCategorize": {
      const placements = (response ?? {}) as Record<string, string>;
      return (
        <SortCategorizePlayer element={element} placements={placements} onChange={onChange} locked={locked} />
      );
    }

    case "memoryMatch": {
      const matched = Array.isArray(response) ? (response as string[]) : [];
      return <MemoryMatchPlayer element={element} matched={matched} onChange={onChange} locked={locked} />;
    }

    case "wordHunt": {
      const tapped = Array.isArray(response) ? (response as number[]) : [];
      return <WordHuntPlayer element={element} tapped={tapped} onChange={onChange} locked={locked} />;
    }

    case "imageHotspots": {
      const found = Array.isArray(response) ? (response as string[]) : [];
      return <ImageHotspotsPlayer element={element} found={found} onChange={onChange} locked={locked} />;
    }

    case "practiceDrill": {
      const counts = (response ?? {}) as Record<string, number>;
      return <PracticeDrillPlayer element={element} counts={counts} onChange={onChange} locked={locked} />;
    }

    // Worksheet elements are printed and filled in on paper — nothing to
    // capture, nothing to score — so on screen they render exactly as the
    // author laid them out, via the same components the canvas uses.
    case "list":
      return <ListBlock element={element} />;

    case "writingLines":
      return <WritingLinesBlock element={element} />;

    default:
      return null;
  }
}

function DragMatchPlayer({
  element,
  pairs,
  onChange,
  locked,
}: {
  element: Extract<CanvasElement, { type: "dragMatch" }>;
  pairs: Record<string, string>;
  onChange: (value: Record<string, string>) => void;
  locked: boolean;
}) {
  const [activeLeft, setActiveLeft] = useState<string | null>(null);
  const matchedRightIds = new Set(Object.values(pairs));

  const pickLeft = (leftId: string) => {
    if (locked) return;
    if (pairs[leftId]) {
      const next = { ...pairs };
      delete next[leftId];
      onChange(next);
      setActiveLeft(null);
      return;
    }
    setActiveLeft(leftId === activeLeft ? null : leftId);
  };

  const pickRight = (rightId: string) => {
    if (locked || !activeLeft || matchedRightIds.has(rightId)) return;
    onChange({ ...pairs, [activeLeft]: rightId });
    setActiveLeft(null);
  };

  // Real drag-and-drop, with tap-tap kept alongside it rather than replaced.
  // HTML5 drag events do not fire on touchscreens at all, and a drag is also
  // unreachable from a keyboard — so dragging is the affordance for a mouse,
  // and tapping is what makes the same activity work on a tablet (which is
  // what a child in a session is most likely holding) and for anyone using
  // the keyboard. Both drive the identical onChange, so an attempt looks the
  // same however it was made.
  const [dragLeft, setDragLeft] = useState<string | null>(null);
  const [dragOverRight, setDragOverRight] = useState<string | null>(null);

  const dropOnRight = (rightId: string) => {
    if (locked || matchedRightIds.has(rightId)) return;
    const leftId = dragLeft ?? activeLeft;
    if (!leftId) return;
    onChange({ ...pairs, [leftId]: rightId });
    setActiveLeft(null);
    setDragLeft(null);
    setDragOverRight(null);
  };

  // The right-hand options are shuffled. Without this they rendered in the
  // same order as the left, so the answer was always "row 1 to row 1" — the
  // activity could be completed top-to-bottom without reading a single word,
  // which makes the score meaningless as a measure of anything.
  //
  // Display order only: the response maps left pair id to right pair id, and
  // scoring compares those ids, so shuffling what the patient sees can never
  // change what counts as correct.
  const rights = useMemo(
    () => seededShuffle(element.pairs, `${element.id}:right`),
    [element.pairs, element.id],
  );

  return (
    <div
      className="flex size-full flex-col gap-2 overflow-auto rounded-lg border border-border bg-card p-3"
      style={cardStyle(element)}
    >
      <p className="font-semibold" style={textStyle(element)}>
        {element.prompt}
      </p>
      {/* One grid holding both columns, cells interleaved left/right, rather
          than two independent stacked columns. A column that sized itself
          left a tall cell (one with a photo in it) unaligned with whatever
          sat beside it; grid rows are a shared height across both columns,
          so the two sides always line up however big the images are. */}
      <div className="grid flex-1 auto-rows-min grid-cols-2 gap-x-3 gap-y-1.5" style={textStyle(element)}>
        {element.pairs.map((p, i) => {
          const isMatched = Boolean(pairs[p.id]);
          const isCorrect = locked && pairs[p.id] === p.id;
          const isWrong = locked && isMatched && pairs[p.id] !== p.id;

          const r = rights[i];
          const takenBy = Object.entries(pairs).find(([, id]) => id === r.id)?.[0];
          const canDrop = !locked && !takenBy && Boolean(dragLeft);

          return (
            <Fragment key={p.id}>
              <button
                type="button"
                disabled={locked}
                draggable={!locked}
                onDragStart={(e) => {
                  setDragLeft(p.id);
                  e.dataTransfer.effectAllowed = "move";
                  // Firefox refuses to start a drag unless something is set.
                  e.dataTransfer.setData("text/plain", p.id);
                }}
                onDragEnd={() => {
                  setDragLeft(null);
                  setDragOverRight(null);
                }}
                onClick={() => pickLeft(p.id)}
                className={cn(
                  "flex min-w-0 items-center gap-1.5 rounded-md border px-2 py-1.5 text-left transition-colors",
                  !locked && "cursor-grab active:cursor-grabbing",
                  dragLeft === p.id && "opacity-50",
                  activeLeft === p.id && "border-primary bg-secondary",
                  isMatched && !locked && "border-primary/60",
                  isCorrect && "border-success bg-success/10",
                  isWrong && "border-destructive bg-destructive/10",
                  !isMatched && activeLeft !== p.id && "border-border hover:bg-muted",
                )}
              >
                {p.leftImage && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.leftImage}
                    alt=""
                    className="shrink-0 rounded object-cover"
                    style={imageStyle(element)}
                  />
                )}
                <span className="truncate">{p.left}</span>
                {isMatched && !locked && <Check className="ml-auto size-3.5 shrink-0 text-primary" />}
              </button>

              <button
                type="button"
                disabled={locked || Boolean(takenBy)}
                onDragOver={(e) => {
                  if (!canDrop) return;
                  // Without preventDefault the browser treats this as "not a
                  // drop target" and the drop event never fires at all.
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  setDragOverRight(r.id);
                }}
                onDragLeave={() => setDragOverRight((c) => (c === r.id ? null : c))}
                onDrop={(e) => {
                  if (!canDrop) return;
                  e.preventDefault();
                  dropOnRight(r.id);
                }}
                onClick={() => pickRight(r.id)}
                className={cn(
                  "flex min-w-0 items-center gap-1.5 rounded-md border px-2 py-1.5 text-left transition-colors",
                  dragOverRight === r.id && "border-primary bg-secondary ring-2 ring-primary/40",
                  canDrop && dragOverRight !== r.id && "border-dashed border-primary/50",
                  takenBy ? "border-primary/60 bg-secondary" : "border-border hover:bg-muted",
                )}
              >
                {r.rightImage && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={r.rightImage}
                    alt=""
                    className="shrink-0 rounded object-cover"
                    style={imageStyle(element)}
                  />
                )}
                <span className="truncate">{r.right}</span>
              </button>
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}

function SequencePlayer({
  element,
  order,
  onChange,
  locked,
}: {
  element: Extract<CanvasElement, { type: "sequence" }>;
  order: string[];
  onChange: (value: string[]) => void;
  locked: boolean;
}) {
  const toggle = (id: string) => {
    if (locked) return;
    if (order.includes(id)) {
      onChange(order.filter((o) => o !== id));
    } else {
      onChange([...order, id]);
    }
  };

  // Shuffled, because the authored order IS the answer: items carry an
  // `order` field and scoring sorts by it, so rendering element.items as
  // authored showed the patient the steps already in the right sequence and
  // the whole task collapsed into tapping top to bottom.
  //
  // Display order only — the response is the sequence of ids the patient
  // tapped, and scoring compares that against the `order` field, so what
  // counts as correct is untouched.
  const items = useMemo(
    () => seededShuffle(element.items, `${element.id}:sequence`),
    [element.items, element.id],
  );

  return (
    <div className="flex size-full flex-col gap-2 overflow-auto rounded-lg border border-border bg-card p-3">
      <p className="text-sm font-semibold">{element.prompt}</p>
      <div className="flex flex-col gap-1.5">
        {items.map((item) => {
          const position = order.indexOf(item.id);
          return (
            <button
              key={item.id}
              type="button"
              disabled={locked}
              onClick={() => toggle(item.id)}
              className={cn(
                "flex min-w-0 items-center gap-2 rounded-md border px-2 py-1.5 text-left text-sm transition-colors",
                position >= 0 ? "border-primary bg-secondary" : "border-border hover:bg-muted",
              )}
            >
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                {position >= 0 ? position + 1 : ""}
              </span>
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Tap-tap, the same two-step selection DragMatchPlayer uses (tap an item,
// then tap where it goes) rather than a native drag gesture — deliberately:
// a real drag is unreliable on a touchscreen and harder to make keyboard-
// accessible, and every other interactive type in this file already commits
// to tap-tap for the same reason.
function SortCategorizePlayer({
  element,
  placements,
  onChange,
  locked,
}: {
  element: Extract<CanvasElement, { type: "sortCategorize" }>;
  placements: Record<string, string>;
  onChange: (value: Record<string, string>) => void;
  locked: boolean;
}) {
  const [activeItem, setActiveItem] = useState<string | null>(null);

  const pickItem = (itemId: string) => {
    if (locked) return;
    if (placements[itemId]) {
      const next = { ...placements };
      delete next[itemId];
      onChange(next);
      setActiveItem(null);
      return;
    }
    setActiveItem(itemId === activeItem ? null : itemId);
  };

  const pickCategory = (categoryId: string) => {
    if (locked || !activeItem) return;
    onChange({ ...placements, [activeItem]: categoryId });
    setActiveItem(null);
  };

  const unplaced = element.items.filter((it) => !placements[it.id]);

  // Same dual approach as DragMatchPlayer: drag for a mouse, tap for touch
  // and keyboard, both writing the identical placement.
  const [dragItem, setDragItem] = useState<string | null>(null);
  const [dragOverCategory, setDragOverCategory] = useState<string | null>(null);

  const dropInCategory = (categoryId: string) => {
    if (locked) return;
    const itemId = dragItem ?? activeItem;
    if (!itemId) return;
    onChange({ ...placements, [itemId]: categoryId });
    setActiveItem(null);
    setDragItem(null);
    setDragOverCategory(null);
  };

  const itemDragProps = (itemId: string) =>
    locked
      ? {}
      : {
          draggable: true,
          onDragStart: (e: React.DragEvent) => {
            setDragItem(itemId);
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", itemId);
          },
          onDragEnd: () => {
            setDragItem(null);
            setDragOverCategory(null);
          },
        };

  return (
    <div
      className="flex size-full flex-col gap-2 overflow-auto rounded-lg border border-border bg-card p-3"
      style={cardStyle(element)}
    >
      <p className="font-semibold" style={textStyle(element)}>
        {element.prompt}
      </p>

      {unplaced.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {unplaced.map((it) => (
            <button
              key={it.id}
              type="button"
              disabled={locked}
              {...itemDragProps(it.id)}
              onClick={() => pickItem(it.id)}
              style={textStyle(element)}
              className={cn(
                "flex items-center gap-1.5 rounded-md border px-2 py-1 transition-colors",
                !locked && "cursor-grab active:cursor-grabbing",
                dragItem === it.id && "opacity-50",
                activeItem === it.id ? "border-primary bg-secondary" : "border-border hover:bg-muted",
              )}
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
            </button>
          ))}
        </div>
      )}

      <div
        className="grid flex-1 gap-2"
        style={{ gridTemplateColumns: `repeat(${element.categories.length}, minmax(0, 1fr))` }}
      >
        {element.categories.map((c) => {
          const placedHere = element.items.filter((it) => placements[it.id] === c.id);
          const acceptsDrop = (Boolean(activeItem) || Boolean(dragItem)) && !locked;
          return (
            // A div, not a button: it has to contain each placed item's own
            // button (tapping an item un-files it), and a button cannot
            // nest another button. role="button" + a key handler keep the
            // "tap this bucket to file the active item" gesture reachable
            // from a keyboard, same as every real <button> elsewhere here.
            <div
              key={c.id}
              role={acceptsDrop ? "button" : undefined}
              tabIndex={acceptsDrop ? 0 : undefined}
              onClick={() => pickCategory(c.id)}
              onKeyDown={(e) => {
                if (acceptsDrop && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  pickCategory(c.id);
                }
              }}
              onDragOver={(e) => {
                if (!dragItem || locked) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                setDragOverCategory(c.id);
              }}
              onDragLeave={() => setDragOverCategory((cur) => (cur === c.id ? null : cur))}
              onDrop={(e) => {
                if (!dragItem || locked) return;
                e.preventDefault();
                dropInCategory(c.id);
              }}
              className={cn(
                "flex flex-col gap-1 rounded-md border border-dashed p-2 text-left transition-colors",
                dragOverCategory === c.id && "border-primary bg-secondary ring-2 ring-primary/40",
                acceptsDrop && dragOverCategory !== c.id
                  ? "cursor-pointer border-primary/60 hover:bg-secondary"
                  : dragOverCategory !== c.id && "border-border",
              )}
            >
              <p className="text-xs font-semibold text-muted-foreground">{c.label}</p>
              {placedHere.map((it) => {
                const correct = locked && it.categoryId === c.id;
                const wrong = locked && it.categoryId !== c.id;
                return (
                  <button
                    key={it.id}
                    type="button"
                    disabled={locked}
                    {...itemDragProps(it.id)}
                    onClick={(e) => {
                      e.stopPropagation();
                      pickItem(it.id);
                    }}
                    style={textStyle(element)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-md border px-2 py-1 text-left transition-colors",
                      !locked && "cursor-grab active:cursor-grabbing",
                      dragItem === it.id && "opacity-50",
                      correct && "border-success bg-success/10 text-success",
                      wrong && "border-destructive bg-destructive/10 text-destructive",
                      !locked && "border-primary/60 bg-secondary hover:bg-muted",
                    )}
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
                    {correct && <Check className="ml-1 inline size-3 shrink-0 text-success" />}
                    {wrong && <X className="ml-1 inline size-3 shrink-0 text-destructive" />}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// A flip-card memory game — genuinely different from DragMatchPlayer even
// though both end in "pairs matched": here the pairing is already known
// (both cards say the same thing), and the task is remembering *where* the
// other half is under a face-down grid, not working out *which* two things
// go together.
function MemoryMatchPlayer({
  element,
  matched,
  onChange,
  locked,
}: {
  element: Extract<CanvasElement, { type: "memoryMatch" }>;
  matched: string[];
  onChange: (value: string[]) => void;
  locked: boolean;
}) {
  // Seeded from the element's own id rather than Math.random(): this is a
  // Client Component that Next.js still server-renders, and a random shuffle
  // produced a different deck on the server than on the client, failing
  // hydration. Seeding makes both passes agree. See lib/canvas/shuffle.ts.
  const cards = useMemo(
    () =>
      seededShuffle(
        element.pairs.flatMap((p) => {
          // Each pair can show two different things (a photo on one card,
          // the word on the other). memoryPairFaces owns the "side B falls
          // back to side A" rule so this does not restate it.
          const { a, b } = memoryPairFaces(p);
          return [
            { id: `${p.id}-a`, pairKey: p.id, ...a },
            { id: `${p.id}-b`, pairKey: p.id, ...b },
          ];
        }),
        `${element.id}:cards`,
      ),
    [element.pairs, element.id],
  );

  // The two currently face-up cards pending a match check — transient,
  // never persisted. Only a confirmed match writes into the response
  // (matched, via onChange); an unmatched pair shown on screen is just
  // local UI state a page refresh is allowed to lose.
  const [faceUp, setFaceUp] = useState<string[]>([]);

  const pick = (cardId: string) => {
    if (locked || matched.includes(cardId)) return;

    // Tapping the single card currently face-up again cancels the pick.
    if (faceUp.length === 1 && faceUp[0] === cardId) {
      setFaceUp([]);
      return;
    }

    // Two mismatched cards are already showing (the player is looking at a
    // miss) — any further tap first clears them, then proceeds to register
    // the new tap below, rather than requiring a separate "dismiss" step.
    const current = faceUp.length === 2 ? [] : faceUp;
    const next = [...current, cardId];

    if (next.length < 2) {
      setFaceUp(next);
      return;
    }

    const [aId, bId] = next;
    const a = cards.find((c) => c.id === aId);
    const b = cards.find((c) => c.id === bId);
    if (a && b && a.pairKey === b.pairKey) {
      onChange([...matched, aId, bId]);
      setFaceUp([]);
    } else {
      setFaceUp(next);
    }
  };

  return (
    <div
      className="flex size-full flex-col gap-2 overflow-auto rounded-lg border border-border bg-card p-3"
      style={cardStyle(element)}
    >
      <p className="font-semibold" style={textStyle(element)}>
        {element.prompt}
      </p>
      <div className="grid flex-1 grid-cols-3 gap-2">
        {cards.map((c) => {
          const isMatchedCard = matched.includes(c.id);
          // Review mode reveals everything, matched or not, so the
          // clinician (or the patient looking back) can see the whole
          // board rather than a wall of card backs.
          const revealed = isMatchedCard || locked || faceUp.includes(c.id);
          return (
            <button
              key={c.id}
              type="button"
              disabled={locked || isMatchedCard}
              onClick={() => pick(c.id)}
              style={textStyle(element)}
              className={cn(
                "flex aspect-square flex-col items-center justify-center gap-1 rounded-md border p-1.5 text-center transition-colors",
                isMatchedCard && "border-success bg-success/10",
                !isMatchedCard && revealed && "border-primary bg-secondary",
                !revealed && "border-border bg-muted hover:bg-muted/70",
              )}
            >
              {revealed ? (
                <>
                  {c.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.image}
                      alt=""
                      className="rounded object-cover"
                      style={imageStyle(element)}
                    />
                  )}
                  <span className="truncate">{c.label}</span>
                </>
              ) : (
                <Brain className="size-4 text-muted-foreground" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Tap every occurrence of a target word in flowing text. tokenizeWordHunt
// and targetTokenIndices are the same functions scoring.ts uses to build
// the answer key, so which words are tappable here and which count as
// correct on review can never quietly diverge from what actually gets
// scored.
function WordHuntPlayer({
  element,
  tapped,
  onChange,
  locked,
}: {
  element: Extract<CanvasElement, { type: "wordHunt" }>;
  tapped: number[];
  onChange: (value: number[]) => void;
  locked: boolean;
}) {
  const tokens = useMemo(() => tokenizeWordHunt(element.passage), [element.passage]);
  const targets = useMemo(
    () => targetTokenIndices(tokens, element.targetWords),
    [tokens, element.targetWords],
  );
  const tappedSet = new Set(tapped);

  const toggle = (i: number) => {
    if (locked) return;
    const next = new Set(tappedSet);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    onChange([...next]);
  };

  return (
    <div className="flex size-full flex-col gap-2 overflow-auto rounded-lg border border-border bg-card p-3">
      <p className="text-sm font-semibold">{element.prompt}</p>
      <p className="flex-1 text-sm leading-relaxed">
        {tokens.map((token, i) => {
          // Punctuation and whitespace render as plain text, not buttons —
          // only a real word is ever something the patient can tap.
          if (!isWordToken(token)) return token;

          const isTapped = tappedSet.has(i);
          const isTarget = targets.has(i);
          return (
            <button
              key={i}
              type="button"
              disabled={locked}
              onClick={() => toggle(i)}
              className={cn(
                "rounded px-0.5 transition-colors",
                !locked && isTapped && "bg-secondary text-primary",
                !locked && !isTapped && "hover:bg-muted",
                locked && isTarget && "bg-success/20 text-success",
                locked && !isTarget && isTapped && "bg-destructive/20 text-destructive line-through",
              )}
            >
              {token}
            </button>
          );
        })}
      </p>
    </div>
  );
}

// A picture the patient searches and taps — the one spatial interaction in
// this file; everything else is a list of authored choices.
//
// Hotspots are positioned as percentages of the image box, so a target keeps
// covering the thing it marks at any element size or player zoom. The image
// uses object-contain inside a relatively-positioned box and the overlay
// shares that box, which keeps the two coordinate systems identical.
function ImageHotspotsPlayer({
  element,
  found,
  onChange,
  locked,
}: {
  element: Extract<CanvasElement, { type: "imageHotspots" }>;
  found: string[];
  onChange: (value: string[]) => void;
  locked: boolean;
}) {
  const foundSet = new Set(found);

  const toggle = (id: string) => {
    if (locked) return;
    const next = new Set(foundSet);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange([...next]);
  };

  return (
    <div
      className="flex size-full flex-col gap-2 overflow-hidden rounded-lg border border-border bg-card p-3"
      style={cardStyle(element)}
    >
      <p className="font-semibold" style={textStyle(element)}>
        {element.prompt}
      </p>
      <p className="text-xs text-muted-foreground">
        Found {foundSet.size} of {element.hotspots.length}
      </p>

      <HotspotFrame element={element} emptyHint="No picture set yet">
        {element.hotspots.map((h) => {
          const isFound = foundSet.has(h.id);
          return (
            <button
              key={h.id}
              type="button"
              disabled={locked}
              onClick={() => toggle(h.id)}
              title={isFound || locked ? h.label : undefined}
              aria-label={h.label}
              className={cn(
                "absolute rounded-md border-2 transition-colors",
                isFound && "border-success bg-success/25",
                // Review reveals every target, so a patient looking back can
                // see what they missed rather than just their own taps.
                !isFound && locked && "border-destructive border-dashed bg-destructive/10",
                !isFound && !locked && element.showOutlines && "border-primary/70 bg-primary/10",
                // The real activity: no outline at all until it is found, so
                // the picture has to actually be searched. Still a real
                // button — focusable, and hit-testable by a screen reader.
                !isFound && !locked && !element.showOutlines && "border-transparent hover:bg-white/20",
              )}
              style={{
                left: `${h.xPct}%`,
                top: `${h.yPct}%`,
                width: `${h.wPct}%`,
                height: `${h.hPct}%`,
              }}
            >
              {(isFound || locked) && (
                <span className="pointer-events-none absolute inset-x-0 bottom-0 truncate bg-black/60 px-1 text-[10px] text-white">
                  {h.label}
                </span>
              )}
            </button>
          );
        })}
      </HotspotFrame>
    </div>
  );
}

// Repetition counting — the shape of real articulation drill work, where the
// unit is "say it five times", not "answer once". Tapping increments; the
// word is done when it reaches its target.
function PracticeDrillPlayer({
  element,
  counts,
  onChange,
  locked,
}: {
  element: Extract<CanvasElement, { type: "practiceDrill" }>;
  counts: Record<string, number>;
  onChange: (value: Record<string, number>) => void;
  locked: boolean;
}) {
  const bump = (id: string, delta: number, target: number) => {
    if (locked) return;
    const current = counts[id] ?? 0;
    // Clamped at the target rather than counting past it: the number on
    // screen is a progress indicator, and letting it run to 9/5 makes the
    // "am I finished" question harder to answer at a glance. Clamped at 0
    // below so an over-tap can always be undone.
    const next = Math.max(0, Math.min(target, current + delta));
    onChange({ ...counts, [id]: next });
  };

  return (
    <div
      className="flex size-full flex-col gap-2 overflow-auto rounded-lg border border-border bg-card p-3"
      style={cardStyle(element)}
    >
      <p className="font-semibold" style={textStyle(element)}>
        {element.prompt}
      </p>
      <div className="flex flex-col gap-1.5">
        {element.words.map((w) => {
          const count = counts[w.id] ?? 0;
          const done = count >= w.target;
          return (
            <div
              key={w.id}
              className={cn(
                "flex items-center gap-2 rounded-md border px-2 py-1.5 transition-colors",
                done ? "border-success bg-success/10" : "border-border",
              )}
              style={textStyle(element)}
            >
              {w.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={w.image}
                  alt=""
                  className="shrink-0 rounded object-cover"
                  style={imageStyle(element)}
                />
              )}
              <span className="min-w-0 flex-1 truncate font-medium">{w.label}</span>

              {/* Dots rather than a bare number: a child counting five
                  repetitions can see at a glance how many are left without
                  reading, which a "3/5" cannot do. */}
              <span className="flex shrink-0 items-center gap-1" aria-hidden>
                {Array.from({ length: w.target }, (_, i) => (
                  <span
                    key={i}
                    className={cn(
                      "size-2 rounded-full",
                      i < count ? "bg-success" : "bg-muted-foreground/25",
                    )}
                  />
                ))}
              </span>
              <span className="sr-only">
                {count} of {w.target} said
              </span>

              <button
                type="button"
                disabled={locked || count === 0}
                onClick={() => bump(w.id, -1, w.target)}
                aria-label={`Undo one repetition of ${w.label}`}
                className="flex size-6 shrink-0 items-center justify-center rounded border border-border text-muted-foreground hover:bg-muted disabled:opacity-30 cursor-pointer"
              >
                <Minus className="size-3" />
              </button>
              <button
                type="button"
                disabled={locked || done}
                onClick={() => bump(w.id, 1, w.target)}
                aria-label={`Count one repetition of ${w.label}`}
                className="flex size-6 shrink-0 items-center justify-center rounded bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-30 cursor-pointer"
              >
                {done ? <Check className="size-3" /> : <Plus className="size-3" />}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
