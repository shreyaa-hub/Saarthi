"use client";

import { Fragment, useMemo, useRef, useState } from "react";
import { Volume2, Check, X, Brain, Plus, Minus, Undo2, Eraser, ThumbsUp, ThumbsDown, RotateCw, ArrowRight, Swords } from "lucide-react";
import type { CanvasElement, DrawStroke } from "@/lib/types/canvas";
import { memoryPairFaces } from "@/lib/types/canvas";
import { isElementCorrect } from "@/lib/scoring";
import { ListBlock, WritingLinesBlock, ChecklistBlock, TableBlock, ArrowBlock, DividerBlock, StickerBlock, SpeechBubbleBlock, CalloutBlock, SheetHeaderBlock, LetterBoxesBlock, NumberLineBlock, RewardStarsBlock, WordBankBlock } from "@/components/canvas/worksheet-elements";
import { seededShuffle } from "@/lib/canvas/shuffle";
import { buildWordSearch, runBetween, matchWord } from "@/lib/canvas/word-search";
import { tokenizeWordHunt, isWordToken, targetTokenIndices } from "@/lib/canvas/word-hunt";
import { textStyle, cardStyle, imageStyle, imagePx, mcGridStyle } from "@/lib/canvas/appearance";
import { HotspotFrame } from "@/components/canvas/hotspot-frame";
import { OptionPicture } from "@/components/canvas/option-picture";
import { Button } from "@/components/ui/button";
import { SpeakButton } from "@/components/player/speak-button";
import { cn } from "@/lib/utils";

// `preview` is not the same thing as `locked`, and conflating them leaked
// answers. Both mean "you cannot interact", but locked also means "you have
// had your go, so here is what you missed" — which is right after an attempt
// and exactly wrong in a library preview, where it showed every answer to
// someone who had not started yet.
export function ElementPlayer({
  element,
  response,
  onChange,
  locked,
  onSubmit,
  preview = false,
}: {
  element: CanvasElement;
  response: unknown;
  onChange: (value: unknown) => void;
  locked: boolean;
  onSubmit: () => void;
  preview?: boolean;
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
      const grid = element.layout === "grid";
      return (
        <div
          className="flex size-full flex-col gap-2 overflow-auto rounded-lg border border-border bg-card p-3"
          style={cardStyle(element)}
        >
          <p className="font-semibold" style={textStyle(element)}>
            {element.prompt}
            <SpeakButton text={element.prompt} />
          </p>
          <div
            className={cn("flex-1", grid ? "grid content-start gap-2" : "flex flex-col gap-1.5")}
            style={grid ? mcGridStyle(element) : undefined}
          >
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
                    "rounded-md border transition-colors",
                    grid
                      ? "flex min-h-11 min-w-0 flex-col items-center gap-1.5 p-2 text-center"
                      : "flex min-h-11 items-center gap-2 px-3 py-2 text-left",
                    isSelected ? "border-primary bg-secondary" : "border-border hover:bg-muted",
                    showResult && o.correct && "border-success bg-success/10",
                    showResult && isSelected && !o.correct && "border-destructive bg-destructive/10",
                  )}
                >
                  <OptionPicture element={element} option={o} grid={grid} />
                  <span className={cn("min-w-0", grid ? "w-full truncate" : "flex-1")}>{o.label}</span>
                  {showResult && o.correct && <Check className="size-4 shrink-0 text-success" />}
                  {showResult && isSelected && !o.correct && <X className="size-4 shrink-0 text-destructive" />}
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
        <div
          className="flex size-full flex-col justify-center gap-2 rounded-lg border border-border bg-card p-3"
          style={cardStyle(element)}
        >
          <p className="flex flex-wrap items-center gap-1" style={textStyle(element)}>
            {parts.map((part, i) => (
              <span key={i} className="flex items-center gap-1">
                {part}
                {i < parts.length - 1 && (
                  <input
                    // The sentence around the field is the whole question, but
                    // it is loose text rather than a label, so a screen reader
                    // announced this as an unnamed edit box. Speaking the
                    // template with the gap read aloud as "blank" gives the
                    // same context the sighted patient gets from the sentence.
                    aria-label={`Fill in the blank: ${element.template.replace(/_{2,}/g, " blank ").replace(/\s+/g, " ").trim()}`}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    disabled={locked}
                    className={cn(
                      "h-11 w-24 border-b-2 bg-transparent px-1 text-center outline-none",
                      locked ? (correct ? "border-success text-success" : "border-destructive text-destructive") : "border-primary",
                    )}
                  />
                )}
              </span>
            ))}
            {/* Speaks the sentence with the gap read out as "blank" — the
                same text the field's own accessible name carries. It gives
                nothing away: the missing word is what the patient supplies. */}
            <SpeakButton
              text={element.template.replace(/_{2,}/g, " blank ").replace(/\s+/g, " ").trim()}
            />
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
      return (
        <ImageHotspotsPlayer
          element={element}
          found={found}
          onChange={onChange}
          locked={locked}
          preview={preview}
        />
      );
    }

    case "practiceDrill": {
      const counts = (response ?? {}) as Record<string, number>;
      return <PracticeDrillPlayer element={element} counts={counts} onChange={onChange} locked={locked} />;
    }

    case "drawPad": {
      const strokes = Array.isArray(response) ? (response as DrawStroke[]) : [];
      return <DrawPadPlayer element={element} strokes={strokes} onChange={onChange} locked={locked} />;
    }

    case "longAnswer": {
      const text = typeof response === "string" ? response : "";
      return <LongAnswerPlayer element={element} text={text} onChange={onChange} locked={locked} />;
    }

    case "yesNo": {
      const picked = response === "yes" || response === "no" ? response : null;
      return <YesNoPlayer element={element} picked={picked} onChange={onChange} locked={locked} />;
    }

    case "flashcards": {
      const known = Array.isArray(response) ? (response as string[]) : [];
      return <FlashcardsPlayer element={element} known={known} onChange={onChange} locked={locked} />;
    }

    case "countTap": {
      const picked = typeof response === "number" ? response : null;
      return <CountTapPlayer element={element} picked={picked} onChange={onChange} locked={locked} />;
    }

    case "wordSearch": {
      const found = Array.isArray(response) ? (response as string[]) : [];
      return <WordSearchPlayer element={element} found={found} onChange={onChange} locked={locked} />;
    }

    case "unscramble": {
      const built = (response ?? {}) as Record<string, string>;
      return <UnscramblePlayer element={element} built={built} onChange={onChange} locked={locked} />;
    }

    case "wordChunks": {
      const built = (response ?? {}) as Record<string, string[]>;
      return <WordChunksPlayer element={element} built={built} onChange={onChange} locked={locked} />;
    }

    case "photoHunt": {
      const tapped = Array.isArray(response) ? (response as string[]) : [];
      return <PhotoHuntPlayer element={element} tapped={tapped} onChange={onChange} locked={locked} />;
    }

    case "sideBySide": {
      const picks = (response ?? {}) as Record<string, string>;
      return <SideBySidePlayer element={element} picks={picks} onChange={onChange} locked={locked} />;
    }

    case "secretWord": {
      const guessed = Array.isArray(response) ? (response as string[]) : [];
      return <SecretWordPlayer element={element} guessed={guessed} onChange={onChange} locked={locked} />;
    }

    case "storyTime": {
      const seen = Array.isArray(response) ? (response as string[]) : [];
      return <StoryTimePlayer element={element} seen={seen} onChange={onChange} locked={locked} />;
    }

    case "puzzle": {
      const order = Array.isArray(response) ? (response as number[]) : [];
      return <PuzzlePlayer element={element} order={order} onChange={onChange} locked={locked} />;
    }

    case "traceGame": {
      const strokes = Array.isArray(response) ? (response as DrawStroke[]) : [];
      return <TraceGamePlayer element={element} strokes={strokes} onChange={onChange} locked={locked} />;
    }

    case "battleTime": {
      const revealed = Array.isArray(response) ? (response as string[]) : [];
      return <BattleTimePlayer element={element} revealed={revealed} onChange={onChange} locked={locked} />;
    }

    // Worksheet elements are printed and filled in on paper — nothing to
    // capture, nothing to score — so on screen they render exactly as the
    // author laid them out, via the same components the canvas uses.
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
            <SpeakButton text={element.prompt} />
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
                  "flex min-h-11 min-w-0 items-center gap-1.5 rounded-md border px-2 py-2 text-left transition-colors",
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
                  "flex min-h-11 min-w-0 items-center gap-1.5 rounded-md border px-2 py-2 text-left transition-colors",
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
    <div
      className="flex size-full flex-col gap-2 overflow-auto rounded-lg border border-border bg-card p-3"
      style={cardStyle(element)}
    >
      <p className="font-semibold" style={textStyle(element)}>{element.prompt}
            <SpeakButton text={element.prompt} /></p>
      <div className="flex flex-col gap-1.5">
        {items.map((item) => {
          const position = order.indexOf(item.id);
          return (
            <button
              key={item.id}
              type="button"
              disabled={locked}
              onClick={() => toggle(item.id)}
              style={textStyle(element)}
              className={cn(
                "flex min-h-11 min-w-0 items-center gap-2 rounded-md border px-2 py-2 text-left transition-colors",
                position >= 0 ? "border-primary bg-secondary" : "border-border hover:bg-muted",
              )}
            >
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                {position >= 0 ? position + 1 : ""}
              </span>
              {item.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.image}
                  alt=""
                  className="shrink-0 rounded object-cover"
                  style={imageStyle(element)}
                />
              )}
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
            <SpeakButton text={element.prompt} />
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
                "flex min-h-11 items-center gap-1.5 rounded-md border px-2 py-2 transition-colors",
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
                      "flex min-h-11 items-center gap-1.5 rounded-md border px-2 py-2 text-left transition-colors",
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
            <SpeakButton text={element.prompt} />
      </p>
      <div className="grid flex-1 grid-cols-3 gap-2">
        {cards.map((c, i) => {
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
              // Without this the whole board is a grid of buttons with no
              // names at all, and the game is unplayable with a screen
              // reader. The name has to change with the card's state, since
              // "what is on this card" is the entire information the game
              // turns on — and it must not leak what is under a face-down
              // card, which is why the face is only named once revealed.
              aria-label={
                revealed
                  ? `Card ${i + 1}: ${c.label || "picture"}${isMatchedCard ? ", matched" : ""}`
                  : `Card ${i + 1}, face down`
              }
              className={cn(
                // Landscape tiles, not square: the photos on them are
                // landscape, and a square tile letterboxed every one of them
                // into a strip with dead space above and below.
                "flex aspect-[4/3] flex-col items-center justify-center gap-1 overflow-hidden rounded-md border p-1.5 text-center transition-colors",
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
                      className="max-w-full rounded object-cover"
                      style={imageStyle(element)}
                    />
                  )}
                  <span className="max-w-full truncate">{c.label}</span>
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
    <div
      className="flex size-full flex-col gap-2 overflow-auto rounded-lg border border-border bg-card p-3"
      style={cardStyle(element)}
    >
      <p className="font-semibold" style={textStyle(element)}>{element.prompt}
            <SpeakButton text={element.prompt} /></p>
      <p className="flex-1 leading-relaxed" style={textStyle(element)}>
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
                // The one place in the player that deliberately does not
                // reach a 44px target. These words are a running sentence,
                // and WCAG 2.5.8 exempts a target whose position is
                // determined by the flow of text for exactly this reason:
                // padding each word out to 44px would break the passage into
                // a column of buttons and destroy the task, which is reading
                // the sentence. Measured at 33px tall, comfortably past the
                // 24px minimum; the horizontal padding widens the short
                // words ("so", "he") without disturbing the line.
                "rounded px-1 py-1 transition-colors",
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
  preview = false,
}: {
  element: Extract<CanvasElement, { type: "imageHotspots" }>;
  found: string[];
  onChange: (value: string[]) => void;
  locked: boolean;
  preview?: boolean;
}) {
  const foundSet = new Set(found);
  // Reveal what was missed only after a real attempt. A preview is locked
  // too, and treating that as "show the answers" outlined and labelled every
  // target for someone who had not started.
  const revealMisses = locked && !preview;

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
            <SpeakButton text={element.prompt} />
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
              title={isFound || revealMisses ? h.label : undefined}
              aria-label={h.label}
              className={cn(
                "absolute rounded-md border-2 transition-colors",
                isFound && "border-success bg-success/25",
                // Review reveals every target, so a patient looking back can
                // see what they missed rather than just their own taps.
                !isFound && revealMisses && "border-destructive border-dashed bg-destructive/10",
                !isFound && !revealMisses && element.showOutlines && "border-primary/70 bg-primary/10",
                // The real activity: no outline at all until it is found, so
                // the picture has to actually be searched. Still a real
                // button — focusable, and hit-testable by a screen reader.
                !isFound && !revealMisses && !element.showOutlines && "border-transparent hover:bg-white/20",
              )}
              style={{
                left: `${h.xPct}%`,
                top: `${h.yPct}%`,
                width: `${h.wPct}%`,
                height: `${h.hPct}%`,
              }}
            >
              {(isFound || revealMisses) && (
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
            <SpeakButton text={element.prompt} />
      </p>
      <div className="flex flex-col gap-1.5">
        {element.words.map((w) => {
          const count = counts[w.id] ?? 0;
          const done = count >= w.target;
          return (
            <div
              key={w.id}
              className={cn(
                "flex min-h-11 items-center gap-2 rounded-md border px-2 py-2 transition-colors",
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
                className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted disabled:opacity-30 cursor-pointer"
              >
                <Minus className="size-3" />
              </button>
              <button
                type="button"
                disabled={locked || done}
                onClick={() => bump(w.id, 1, w.target)}
                aria-label={`Count one repetition of ${w.label}`}
                className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-30 cursor-pointer"
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

// Turns a stroke's normalised points into an SVG path. The pad's viewBox is
// 0 0 1 1, so the stored coordinates go straight in with no conversion — the
// whole point of storing them normalised.
export function strokePath(stroke: DrawStroke): string {
  if (stroke.length === 0) return "";
  const [first, ...rest] = stroke;
  return `M ${first.x} ${first.y}` + rest.map((p) => ` L ${p.x} ${p.y}`).join("");
}

// Draw or trace with a finger, a stylus or a mouse. Pointer events rather
// than separate mouse and touch handlers: one code path covers all three,
// which is what a tablet in a clinic actually needs.
//
// SVG rather than <canvas>: the strokes are already state, so the picture is
// a pure function of that state and redraws itself on undo, on resize and
// when the clinician later opens the finished attempt — with a canvas every
// one of those needs an imperative repaint, and a server-rendered canvas
// starts blank.
function DrawPadPlayer({
  element,
  strokes,
  onChange,
  locked,
}: {
  element: Extract<CanvasElement, { type: "drawPad" }>;
  strokes: DrawStroke[];
  onChange: (value: DrawStroke[]) => void;
  locked: boolean;
}) {
  const padRef = useRef<HTMLDivElement>(null);
  // The stroke under the finger right now. Kept local and committed on
  // pointer-up so a drag writes one response update instead of one per
  // pointermove — at 60Hz that is the difference between a smooth line and
  // a stuttering one on a tablet.
  const [live, setLive] = useState<DrawStroke | null>(null);

  // Normalised to the pad's own box (0..1), clamped so a finger that slides
  // off the edge mid-stroke leaves a line that stops at the edge rather than
  // one that jumps somewhere outside the drawing.
  const pointAt = (e: React.PointerEvent): { x: number; y: number } | null => {
    const box = padRef.current?.getBoundingClientRect();
    if (!box || box.width === 0 || box.height === 0) return null;
    return {
      x: Math.min(1, Math.max(0, (e.clientX - box.left) / box.width)),
      y: Math.min(1, Math.max(0, (e.clientY - box.top) / box.height)),
    };
  };

  const start = (e: React.PointerEvent) => {
    if (locked) return;
    const p = pointAt(e);
    if (!p) return;
    // Capture, so a stroke that wanders outside the pad keeps arriving here
    // instead of being stolen by whatever is underneath.
    e.currentTarget.setPointerCapture(e.pointerId);
    setLive([p]);
  };

  const extend = (e: React.PointerEvent) => {
    if (locked || !live) return;
    const p = pointAt(e);
    if (!p) return;
    setLive([...live, p]);
  };

  const finish = () => {
    if (!live) return;
    // A single point is a tap, not a mark — dropping it keeps stray taps out
    // of the drawing and out of what scoring counts as an attempt.
    if (live.length >= 2) onChange([...strokes, live]);
    setLive(null);
  };

  const shown = live ? [...strokes, live] : strokes;

  return (
    <div
      className="flex size-full flex-col gap-2 overflow-hidden rounded-lg border border-border bg-card p-3"
      style={cardStyle(element)}
    >
      <div className="flex items-center gap-2">
        <p className="min-w-0 flex-1 font-semibold" style={textStyle(element)}>
          {element.prompt}
            <SpeakButton text={element.prompt} />
        </p>
        <button
          type="button"
          disabled={locked || strokes.length === 0}
          onClick={() => onChange(strokes.slice(0, -1))}
          aria-label="Undo last stroke"
          title="Undo"
          className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted disabled:opacity-30 cursor-pointer"
        >
          <Undo2 className="size-3.5" />
        </button>
        <button
          type="button"
          disabled={locked || strokes.length === 0}
          onClick={() => onChange([])}
          aria-label="Clear the drawing"
          title="Clear"
          className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted disabled:opacity-30 cursor-pointer"
        >
          <Eraser className="size-3.5" />
        </button>
      </div>

      <div
        ref={padRef}
        onPointerDown={start}
        onPointerMove={extend}
        onPointerUp={finish}
        onPointerCancel={finish}
        // touch-none is not decoration: without it the browser claims the
        // gesture for scrolling and the patient's line never starts.
        className={cn(
          "relative min-h-0 flex-1 touch-none select-none overflow-hidden rounded-md border border-dashed border-border bg-white",
          !locked && "cursor-crosshair",
        )}
      >
        {element.backgroundSrc && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={element.backgroundSrc}
            alt=""
            draggable={false}
            className="pointer-events-none absolute inset-0 size-full object-contain opacity-40"
          />
        )}
        <svg
          viewBox="0 0 1 1"
          // The pad is whatever shape the element was resized to, so the
          // viewBox is stretched to fit it. non-scaling-stroke keeps the pen
          // an even width in screen pixels regardless — without it a wide
          // short pad draws horizontal lines thin and vertical ones fat.
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 size-full"
        >
          {shown.map((s, i) => (
            <path
              key={i}
              d={strokePath(s)}
              fill="none"
              stroke={element.strokeColor}
              strokeWidth={element.strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
      </div>
    </div>
  );
}

// An open written response. Nothing here is marked — a language sample has
// no key — so the only feedback is the word count against whatever minimum
// the clinician set, which tells the patient when they have written enough.
function LongAnswerPlayer({
  element,
  text,
  onChange,
  locked,
}: {
  element: Extract<CanvasElement, { type: "longAnswer" }>;
  text: string;
  onChange: (value: string) => void;
  locked: boolean;
}) {
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const enough = words >= Math.max(1, element.minWords);

  return (
    <div
      className="flex size-full flex-col gap-2 overflow-hidden rounded-lg border border-border bg-card p-3"
      style={cardStyle(element)}
    >
      <p className="font-semibold" style={textStyle(element)}>
        {element.prompt}
            <SpeakButton text={element.prompt} />
      </p>
      <textarea
        value={text}
        onChange={(e) => onChange(e.target.value)}
        disabled={locked}
        placeholder={element.placeholder}
        style={textStyle(element)}
        className="min-h-0 flex-1 resize-none rounded-md border border-border bg-background p-2 outline-none focus:border-primary disabled:opacity-70"
      />
      <p className="shrink-0 text-xs text-muted-foreground">
        {words} {words === 1 ? "word" : "words"}
        {element.minWords > 0 && (
          <span className={cn("ml-1", enough ? "text-success" : "text-muted-foreground")}>
            (at least {element.minWords} needed)
          </span>
        )}
      </p>
    </div>
  );
}

// Two very large buttons and nothing else. Sized by the element rather than
// by a font scale, so a clinician who wants a bigger target just makes the
// element bigger — which is the control a three-year-old's reach actually
// needs, and one no font-size field would give them.
function YesNoPlayer({
  element,
  picked,
  onChange,
  locked,
}: {
  element: Extract<CanvasElement, { type: "yesNo" }>;
  picked: "yes" | "no" | null;
  onChange: (value: string) => void;
  locked: boolean;
}) {
  const answered = picked !== null;

  return (
    <div
      className="flex size-full flex-col gap-2 overflow-hidden rounded-lg border border-border bg-card p-3"
      style={cardStyle(element)}
    >
      <p className="shrink-0 text-center font-semibold" style={textStyle(element)}>
        {element.prompt}
            <SpeakButton text={element.prompt} />
      </p>

      {element.imageSrc && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={element.imageSrc}
          alt=""
          className="min-h-0 w-full flex-1 rounded-md object-contain"
        />
      )}

      <div className="grid shrink-0 grid-cols-2 gap-3">
        {(["yes", "no"] as const).map((side) => {
          const isPicked = picked === side;
          const isAnswer = element.answer === side;
          return (
            <button
              key={side}
              type="button"
              disabled={locked}
              onClick={() => onChange(side)}
              style={textStyle(element)}
              className={cn(
                "flex items-center justify-center gap-2 rounded-xl border-2 py-4 font-semibold transition-colors",
                isPicked ? "border-primary bg-secondary" : "border-border hover:bg-muted",
                // After submitting: the right answer is marked whether or not
                // it was chosen, so a child who got it wrong is shown what the
                // answer was rather than only that they were wrong.
                locked && isAnswer && "border-success bg-success/15",
                locked && isPicked && !isAnswer && "border-destructive bg-destructive/15",
              )}
            >
              {side === "yes" ? <ThumbsUp className="size-5" /> : <ThumbsDown className="size-5" />}
              {side === "yes" ? element.yesLabel : element.noLabel}
              {locked && isAnswer && <Check className="size-4 text-success" />}
              {locked && isPicked && !isAnswer && <X className="size-4 text-destructive" />}
            </button>
          );
        })}
      </div>

      {!locked && !answered && (
        <p className="shrink-0 text-center text-xs text-muted-foreground">Tap one.</p>
      )}
    </div>
  );
}

// One card at a time, filling the element. A deck rather than a page of
// questions is the whole design: one card is the entire visual field, which
// is what makes this usable for a child who cannot scan a grid.
//
// Nothing here is marked by the app — there is no input to check — so the
// buttons say "I knew it" and "Practise again" rather than right and wrong.
// What gets recorded is the child's own rating, which is the thing a
// clinician asks for anyway.
function FlashcardsPlayer({
  element,
  known,
  onChange,
  locked,
}: {
  element: Extract<CanvasElement, { type: "flashcards" }>;
  known: string[];
  onChange: (value: string[]) => void;
  locked: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const card = element.cards[Math.min(index, element.cards.length - 1)];
  const knownSet = new Set(known);
  const atEnd = index >= element.cards.length - 1;

  if (!card) {
    return (
      <div className="flex size-full items-center justify-center rounded-lg border border-border bg-card p-3">
        <p className="text-center text-xs text-muted-foreground">No cards yet.</p>
      </div>
    );
  }

  const rate = (gotIt: boolean) => {
    if (locked) return;
    // Re-rating a card already seen replaces the old rating rather than
    // adding a second one, so the count can never exceed the deck.
    const next = known.filter((id) => id !== card.id);
    onChange(gotIt ? [...next, card.id] : next);
    setFlipped(false);
    if (!atEnd) setIndex((i) => i + 1);
  };

  const face = flipped ? { text: card.back, image: card.backImage } : { text: card.front, image: card.frontImage };

  return (
    <div
      className="flex size-full flex-col gap-2 overflow-hidden rounded-lg border border-border bg-card p-3"
      style={cardStyle(element)}
    >
      <div className="flex shrink-0 items-center gap-2">
        <p className="min-w-0 flex-1 truncate font-semibold" style={textStyle(element)}>
          {element.prompt}
            <SpeakButton text={element.prompt} />
        </p>
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
          {index + 1}/{element.cards.length} · {knownSet.size} known
        </span>
      </div>

      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        aria-label={flipped ? "Turn the card back" : "Turn the card over"}
        className={cn(
          "flex min-h-0 flex-1 flex-col items-center justify-center gap-2 rounded-xl border-2 p-3 text-center transition-colors",
          flipped ? "border-primary bg-secondary" : "border-border bg-muted/40 hover:bg-muted",
        )}
        style={textStyle(element)}
      >
        {face.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={face.image} alt="" className="max-h-full min-h-0 max-w-full flex-1 object-contain" />
        )}
        <span className="max-w-full break-words text-2xl font-semibold">{face.text}</span>
        <span className="flex items-center gap-1 text-xs font-normal text-muted-foreground">
          <RotateCw className="size-3" /> {flipped ? "Tap to go back" : "Tap to turn over"}
        </span>
      </button>

      <div className="grid shrink-0 grid-cols-2 gap-2">
        <button
          type="button"
          disabled={locked}
          onClick={() => rate(false)}
          className="min-h-11 rounded-lg border border-border py-2 text-sm font-medium hover:bg-muted disabled:opacity-40 cursor-pointer"
        >
          Practise again
        </button>
        <button
          type="button"
          disabled={locked}
          onClick={() => rate(true)}
          className={cn(
            "flex min-h-11 items-center justify-center gap-1.5 rounded-lg border py-2 text-sm font-medium cursor-pointer disabled:opacity-40",
            knownSet.has(card.id)
              ? "border-success bg-success/15 text-success"
              : "border-border hover:bg-muted",
          )}
        >
          <Check className="size-4" /> I knew it
        </button>
      </div>

      {!atEnd && (
        <button
          type="button"
          onClick={() => {
            setFlipped(false);
            setIndex((i) => i + 1);
          }}
          className="flex min-h-11 shrink-0 items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
        >
          Skip to the next card <ArrowRight className="size-3" />
        </button>
      )}
    </div>
  );
}

// Count the pictures, tap the number. Counting is the one early-cognitive
// skill none of the other types touch, and the whole interaction is a single
// tap on a big number.
function CountTapPlayer({
  element,
  picked,
  onChange,
  locked,
}: {
  element: Extract<CanvasElement, { type: "countTap" }>;
  picked: number | null;
  onChange: (value: number) => void;
  locked: boolean;
}) {
  // Clamped so a mis-typed count cannot render ten thousand apples and hang
  // the page, and so the choices always at least reach the right answer —
  // a task whose answer is not on offer is unanswerable.
  const count = Math.max(0, Math.min(20, Math.round(element.count)));
  const maxChoice = Math.max(count, Math.min(10, Math.round(element.maxChoice) || 5));

  return (
    <div
      className="flex size-full flex-col gap-2 overflow-hidden rounded-lg border border-border bg-card p-3"
      style={cardStyle(element)}
    >
      <p className="shrink-0 text-center font-semibold" style={textStyle(element)}>
        {element.prompt}
            <SpeakButton text={element.prompt} />
      </p>

      <div className="flex min-h-0 flex-1 flex-wrap items-center justify-center gap-2 overflow-hidden">
        {Array.from({ length: count }, (_, i) =>
          element.imageSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={element.imageSrc}
              alt=""
              className="rounded object-cover"
              style={imageStyle(element)}
            />
          ) : (
            <span key={i} className="text-3xl leading-none" aria-hidden>
              {element.emoji}
            </span>
          ),
        )}
        {/* The count is the answer, so it must not be announced — but the
            picture still needs a name for anyone using a screen reader. */}
        <span className="sr-only">A group of {element.emoji || "pictures"} to count</span>
      </div>

      <div className="flex shrink-0 flex-wrap justify-center gap-2">
        {Array.from({ length: maxChoice }, (_, i) => i + 1).map((n) => {
          const isPicked = picked === n;
          const isAnswer = n === count;
          return (
            <button
              key={n}
              type="button"
              disabled={locked}
              onClick={() => onChange(n)}
              className={cn(
                "flex size-11 items-center justify-center rounded-xl border-2 text-lg font-bold transition-colors",
                isPicked ? "border-primary bg-secondary" : "border-border hover:bg-muted",
                locked && isAnswer && "border-success bg-success/15",
                locked && isPicked && !isAnswer && "border-destructive bg-destructive/15",
              )}
            >
              {n}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Tap the first letter of a word, then the last. Two taps rather than a
// drag across the grid: a drag has to be tracked across a dozen small
// squares without leaving any of them, which is exactly the motor control
// the children using this often do not have, and the same two taps work
// identically with a mouse, a finger and a keyboard.
function WordSearchPlayer({
  element,
  found,
  onChange,
  locked,
}: {
  element: Extract<CanvasElement, { type: "wordSearch" }>;
  found: string[];
  onChange: (value: string[]) => void;
  locked: boolean;
}) {
  // Rebuilt from the element rather than stored, so the board is identical
  // on the server, in the client, and later when the attempt is marked.
  const grid = useMemo(
    () => buildWordSearch(element.words, element.size, element.id),
    [element.words, element.size, element.id],
  );

  const [anchor, setAnchor] = useState<{ row: number; col: number } | null>(null);
  const foundSet = new Set(found.map((w) => w.toUpperCase()));

  // Every square belonging to a word already found, so it can stay
  // highlighted — the reward for finding one is seeing it stay lit.
  //
  // Not memoised: the only sensible key is the found list, which arrives as a
  // fresh array from the parent on every render, so a memo would recompute
  // every time anyway while claiming not to. The work is a handful of words
  // times a handful of letters.
  const solvedCells = new Set<string>();
  for (const p of grid.placements) {
    if (!foundSet.has(p.word)) continue;
    for (let i = 0; i < p.word.length; i++) {
      solvedCells.add(`${p.row + p.dRow * i}:${p.col + p.dCol * i}`);
    }
  }

  const tap = (row: number, col: number) => {
    if (locked) return;
    if (!anchor) {
      setAnchor({ row, col });
      return;
    }
    if (anchor.row === row && anchor.col === col) {
      setAnchor(null); // tapping the anchor again cancels
      return;
    }
    const run = runBetween(grid, anchor, { row, col });
    setAnchor(null);
    if (!run) return;
    const hit = matchWord(run.word, element.words);
    if (hit && !foundSet.has(hit)) onChange([...found, hit]);
  };

  const placedWords = grid.placements.map((p) => p.word);

  return (
    <div
      className="flex size-full flex-col gap-2 overflow-auto rounded-lg border border-border bg-card p-3"
      style={cardStyle(element)}
    >
      <p className="font-semibold" style={textStyle(element)}>
        {element.prompt}
            <SpeakButton text={element.prompt} />
      </p>
      <p className="text-xs text-muted-foreground">
        Found {foundSet.size} of {placedWords.length}
        {anchor ? " · now tap the last letter" : " · tap the first letter of a word"}
      </p>

      <div
        className="grid gap-0.5"
        style={{ gridTemplateColumns: `repeat(${grid.size}, minmax(0, 1fr))` }}
      >
        {grid.cells.map((row, r) =>
          row.map((letter, c) => {
            const isSolved = solvedCells.has(`${r}:${c}`);
            const isAnchor = anchor?.row === r && anchor?.col === c;
            return (
              <button
                key={`${r}:${c}`}
                type="button"
                disabled={locked}
                onClick={() => tap(r, c)}
                aria-label={`Row ${r + 1}, column ${c + 1}, letter ${letter}`}
                className={cn(
                  "flex aspect-square min-h-9 items-center justify-center rounded font-semibold uppercase transition-colors",
                  isSolved && "bg-success/25 text-success",
                  !isSolved && isAnchor && "bg-primary text-primary-foreground",
                  !isSolved && !isAnchor && "bg-muted/60 hover:bg-muted",
                )}
              >
                {letter}
              </button>
            );
          }),
        )}
      </div>

      <div className="flex flex-wrap gap-1.5" style={textStyle(element)}>
        {placedWords.map((w) => (
          <span
            key={w}
            className={cn(
              "rounded-md border px-2 py-1",
              foundSet.has(w)
                ? "border-success bg-success/10 text-success line-through"
                : "border-border",
            )}
          >
            {w}
          </span>
        ))}
      </div>

      {/* A word the grid could not fit is left off the list entirely rather
          than shown as a word to find that is not there. */}
      {grid.skipped.length > 0 && (
        <p className="text-[11px] text-muted-foreground">
          Too long for this grid: {grid.skipped.join(", ")}. Make the grid bigger to include them.
        </p>
      )}
    </div>
  );
}

// Shared by Unscramble and Word Chunks: a row of shuffled tiles, and the
// answer being built above it. Tapping a tile moves it up, tapping a built
// tile sends it back — no dragging, because dropping a letter precisely is a
// motor task and this is a spelling task.
function TileBuilder({
  tiles,
  built,
  onBuiltChange,
  locked,
  correct,
  style,
}: {
  tiles: string[];
  built: number[];
  onBuiltChange: (next: number[]) => void;
  locked: boolean;
  correct: boolean | null;
  style?: React.CSSProperties;
}) {
  const used = new Set(built);

  return (
    <div className="flex flex-col gap-1.5">
      <div
        className={cn(
          "flex min-h-11 flex-wrap items-center gap-1 rounded-md border-2 border-dashed p-1.5",
          correct === true && "border-success bg-success/10",
          correct === false && "border-destructive bg-destructive/10",
          correct === null && "border-border",
        )}
        style={style}
      >
        {built.length === 0 && (
          <span className="px-1 text-xs text-muted-foreground">Tap the tiles below</span>
        )}
        {built.map((tileIndex, position) => (
          <button
            key={`${tileIndex}-${position}`}
            type="button"
            disabled={locked}
            onClick={() => onBuiltChange(built.filter((_, i) => i !== position))}
            aria-label={`Remove ${tiles[tileIndex]}`}
            className="min-h-9 rounded border border-primary bg-secondary px-2 py-1 font-semibold uppercase cursor-pointer disabled:cursor-default"
          >
            {tiles[tileIndex]}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-1">
        {tiles.map((tile, i) =>
          used.has(i) ? null : (
            <button
              key={i}
              type="button"
              disabled={locked}
              onClick={() => onBuiltChange([...built, i])}
              className="min-h-11 rounded-md border border-border bg-muted/50 px-3 py-1.5 font-semibold uppercase hover:bg-muted cursor-pointer disabled:cursor-default"
            >
              {tile}
            </button>
          ),
        )}
      </div>
    </div>
  );
}

function UnscramblePlayer({
  element,
  built,
  onChange,
  locked,
}: {
  element: Extract<CanvasElement, { type: "unscramble" }>;
  built: Record<string, string>;
  onChange: (value: Record<string, string>) => void;
  locked: boolean;
}) {
  return (
    <div
      className="flex size-full flex-col gap-3 overflow-auto rounded-lg border border-border bg-card p-3"
      style={cardStyle(element)}
    >
      <p className="font-semibold" style={textStyle(element)}>
        {element.prompt}
            <SpeakButton text={element.prompt} />
      </p>

      {element.words.map((w) => {
        const target = w.word.toUpperCase().replace(/\s+/g, "");
        // Shuffled per word and seeded, so the scramble is stable across the
        // server and client passes — and deranged, so no letter is left where
        // it started and the word is never already spelled out.
        const tiles = seededShuffle([...target], `${element.id}:${w.id}`);
        const attempt = built[w.id] ?? "";
        const indices = attemptToIndices(attempt, tiles);
        const isRight = attempt.length > 0 ? attempt.toUpperCase() === target : null;

        return (
          <div key={w.id} className="flex flex-col gap-1" style={textStyle(element)}>
            {w.hint && <p className="text-xs text-muted-foreground">{w.hint}</p>}
            <TileBuilder
              tiles={tiles}
              built={indices}
              locked={locked}
              correct={locked ? attempt.toUpperCase() === target : isRight}
              style={textStyle(element)}
              onBuiltChange={(next) =>
                onChange({ ...built, [w.id]: next.map((i) => tiles[i]).join("") })
              }
            />
          </div>
        );
      })}
    </div>
  );
}

function WordChunksPlayer({
  element,
  built,
  onChange,
  locked,
}: {
  element: Extract<CanvasElement, { type: "wordChunks" }>;
  built: Record<string, string[]>;
  onChange: (value: Record<string, string[]>) => void;
  locked: boolean;
}) {
  return (
    <div
      className="flex size-full flex-col gap-3 overflow-auto rounded-lg border border-border bg-card p-3"
      style={cardStyle(element)}
    >
      <p className="font-semibold" style={textStyle(element)}>
        {element.prompt}
            <SpeakButton text={element.prompt} />
      </p>

      {element.items.map((item) => {
        const tiles = seededShuffle(item.chunks, `${element.id}:${item.id}`);
        const attempt = built[item.id] ?? [];
        const indices = attemptToIndices(attempt, tiles);
        const isRight =
          attempt.length === item.chunks.length &&
          attempt.every((c, i) => c.toUpperCase() === item.chunks[i].toUpperCase());

        return (
          <div key={item.id} className="flex flex-col gap-1" style={textStyle(element)}>
            <TileBuilder
              tiles={tiles}
              built={indices}
              locked={locked}
              correct={attempt.length === 0 && !locked ? null : isRight}
              style={textStyle(element)}
              onBuiltChange={(next) => onChange({ ...built, [item.id]: next.map((i) => tiles[i]) })}
            />
          </div>
        );
      })}
    </div>
  );
}

// The response stores what the patient built, not which tiles they used, so
// that a saved attempt still means something if the shuffle ever changes.
// This maps it back to tile positions for rendering. Duplicate tiles (the two
// Ts in BUTTER) are matched left to right and each consumed once, so the same
// tile is never shown as used twice.
function attemptToIndices(attempt: string | string[], tiles: string[]): number[] {
  const wanted = typeof attempt === "string" ? [...attempt] : attempt;
  const taken = new Set<number>();
  const out: number[] = [];
  for (const piece of wanted) {
    const i = tiles.findIndex(
      (t, idx) => !taken.has(idx) && t.toUpperCase() === piece.toUpperCase(),
    );
    if (i === -1) continue;
    taken.add(i);
    out.push(i);
  }
  return out;
}

// One picture, drawn from an emoji or an upload. Shared by the hunt and the
// comparison so both accept either without each restating the fallback.
function PictureFace({
  emoji,
  imageSrc,
  size,
}: {
  emoji?: string;
  imageSrc?: string;
  size: number;
}) {
  if (imageSrc) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={imageSrc} alt="" className="rounded object-cover" style={{ width: "100%", height: size }} />
    );
  }
  return (
    <span className="leading-none" style={{ fontSize: size }} aria-hidden>
      {emoji || "🔲"}
    </span>
  );
}

// Several right answers among distractors — the difference from a
// picture-choice question, which has exactly one. Tapping is a toggle so a
// change of mind costs nothing, and a wrong tap is subtracted at scoring
// time rather than blocked here: seeing what a child taps by mistake is the
// clinically interesting part.
function PhotoHuntPlayer({
  element,
  tapped,
  onChange,
  locked,
}: {
  element: Extract<CanvasElement, { type: "photoHunt" }>;
  tapped: string[];
  onChange: (value: string[]) => void;
  locked: boolean;
}) {
  const set = new Set(tapped);
  const cols = Math.max(1, Math.min(element.columns || 4, element.items.length || 1));

  const toggle = (id: string) => {
    if (locked) return;
    onChange(set.has(id) ? tapped.filter((t) => t !== id) : [...tapped, id]);
  };

  return (
    <div
      className="flex size-full flex-col gap-2 overflow-auto rounded-lg border border-border bg-card p-3"
      style={cardStyle(element)}
    >
      <p className="font-semibold" style={textStyle(element)}>
        {element.prompt}
            <SpeakButton text={element.prompt} />
      </p>
      <p className="text-xs text-muted-foreground">Tapped {set.size}</p>

      <div
        className="grid flex-1 content-start gap-2"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {element.items.map((item) => {
          const isTapped = set.has(item.id);
          return (
            <button
              key={item.id}
              type="button"
              disabled={locked}
              onClick={() => toggle(item.id)}
              aria-pressed={isTapped}
              style={textStyle(element)}
              className={cn(
                "flex min-h-11 flex-col items-center justify-center gap-1 rounded-lg border-2 p-2 text-center transition-colors",
                isTapped ? "border-primary bg-secondary" : "border-border hover:bg-muted",
                // Review shows every target, found or missed, so the child
                // sees what they were looking for rather than only that they
                // were wrong.
                locked && item.isTarget && "border-success bg-success/15",
                locked && isTapped && !item.isTarget && "border-destructive bg-destructive/15",
              )}
            >
              <PictureFace emoji={item.emoji} imageSrc={item.imageSrc} size={imagePx(element)} />
              <span className="w-full truncate">{item.label}</span>
              {locked && item.isTarget && <Check className="size-4 text-success" />}
              {locked && isTapped && !item.isTarget && <X className="size-4 text-destructive" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Two things, one question, two enormous targets. The whole point of the
// format is that a child who cannot yet scan a list of four options can
// still answer a comparison, so the two panels split the element between
// them rather than sitting in a row of small cards.
function SideBySidePlayer({
  element,
  picks,
  onChange,
  locked,
}: {
  element: Extract<CanvasElement, { type: "sideBySide" }>;
  picks: Record<string, string>;
  onChange: (value: Record<string, string>) => void;
  locked: boolean;
}) {
  return (
    <div
      className="flex size-full flex-col gap-3 overflow-auto rounded-lg border border-border bg-card p-3"
      style={cardStyle(element)}
    >
      <p className="font-semibold" style={textStyle(element)}>
        {element.prompt}
            <SpeakButton text={element.prompt} />
      </p>

      {element.rounds.map((round) => {
        const picked = picks[round.id];
        return (
          <div key={round.id} className="flex flex-col gap-1.5">
            <p style={textStyle(element)}>{round.question}</p>
            <div className="grid grid-cols-2 gap-3">
              {(["a", "b"] as const).map((side) => {
                const face = round[side];
                const isPicked = picked === side;
                const isAnswer = round.answer === side;
                return (
                  <button
                    key={side}
                    type="button"
                    disabled={locked}
                    onClick={() => onChange({ ...picks, [round.id]: side })}
                    style={textStyle(element)}
                    className={cn(
                      "flex min-h-11 flex-col items-center justify-center gap-1 rounded-xl border-2 p-3 text-center transition-colors",
                      isPicked ? "border-primary bg-secondary" : "border-border hover:bg-muted",
                      locked && isAnswer && "border-success bg-success/15",
                      locked && isPicked && !isAnswer && "border-destructive bg-destructive/15",
                    )}
                  >
                    <PictureFace emoji={face.emoji} imageSrc={face.imageSrc} size={imagePx(element)} />
                    <span className="w-full truncate font-semibold">{face.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const SECRET_ALPHABET = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"];

// Letters appear in place as they are guessed. No hanging figure and no
// sudden loss: running out of guesses reveals the word rather than ending
// the game, because the point is to meet the word, not to be beaten by it.
function SecretWordPlayer({
  element,
  guessed,
  onChange,
  locked,
}: {
  element: Extract<CanvasElement, { type: "secretWord" }>;
  guessed: string[];
  onChange: (value: string[]) => void;
  locked: boolean;
}) {
  const guessedSet = new Set(guessed.map((g) => g.toUpperCase()));
  const letters = [...element.word.toUpperCase()];
  const inWord = new Set(letters.filter((c) => /[A-Z]/.test(c)));

  const wrong = [...guessedSet].filter((g) => !inWord.has(g));
  const outOfGuesses = wrong.length >= element.maxWrong;
  const solved = [...inWord].every((c) => guessedSet.has(c));
  // Revealed once solved, once the guesses run out, or on review — never
  // leaving a child staring at blanks they cannot fill.
  const reveal = solved || outOfGuesses || locked;

  return (
    <div
      className="flex size-full flex-col gap-3 overflow-auto rounded-lg border border-border bg-card p-3"
      style={cardStyle(element)}
    >
      <div className="flex items-baseline gap-2">
        <p className="min-w-0 flex-1 font-semibold" style={textStyle(element)}>
          {element.prompt}
            <SpeakButton text={element.prompt} />
        </p>
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
          {wrong.length}/{element.maxWrong} wrong
        </span>
      </div>

      {element.hint && (
        <p className="text-xs text-muted-foreground">Clue: {element.hint}</p>
      )}

      <div className="flex flex-wrap justify-center gap-1.5">
        {letters.map((ch, i) =>
          /[A-Z]/.test(ch) ? (
            <span
              key={i}
              className={cn(
                "flex size-11 items-center justify-center rounded-lg border-b-4 text-2xl font-bold",
                guessedSet.has(ch) || reveal
                  ? solved || guessedSet.has(ch)
                    ? "border-success text-foreground"
                    : "border-destructive text-destructive"
                  : "border-border text-transparent",
              )}
            >
              {guessedSet.has(ch) || reveal ? ch : "?"}
            </span>
          ) : (
            <span key={i} className="w-3" />
          ),
        )}
      </div>

      {solved && <p className="text-center text-sm font-semibold text-success">You got it!</p>}
      {!solved && outOfGuesses && (
        <p className="text-center text-sm text-muted-foreground">
          Out of guesses — the word was {element.word.toUpperCase()}.
        </p>
      )}

      <div className="flex flex-wrap justify-center gap-1">
        {SECRET_ALPHABET.map((letter) => {
          const used = guessedSet.has(letter);
          const isIn = inWord.has(letter);
          return (
            <button
              key={letter}
              type="button"
              disabled={locked || used || solved || outOfGuesses}
              onClick={() => onChange([...guessed, letter])}
              className={cn(
                "size-9 rounded-md border text-sm font-semibold transition-colors",
                !used && "border-border hover:bg-muted cursor-pointer",
                used && isIn && "border-success bg-success/15 text-success",
                used && !isIn && "border-destructive bg-destructive/10 text-destructive line-through",
              )}
            >
              {letter}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// A picture book, one page at a time. Nothing is marked, so what gets
// recorded is which pages were actually reached — the only honest measure of
// a shared-reading activity, and the one a clinician wants when they sent it
// home rather than watched it.
function StoryTimePlayer({
  element,
  seen,
  onChange,
  locked,
}: {
  element: Extract<CanvasElement, { type: "storyTime" }>;
  seen: string[];
  onChange: (value: string[]) => void;
  locked: boolean;
}) {
  const [index, setIndex] = useState(0);
  const page = element.pages[Math.min(index, element.pages.length - 1)];
  const seenSet = new Set(seen);

  // The first page counts as read as soon as it is on screen. Recorded on
  // navigation rather than in an effect, because "the child turned to this
  // page" is an event, not a consequence of rendering.
  const go = (next: number) => {
    const target = element.pages[next];
    if (!target) return;
    setIndex(next);
    if (!seenSet.has(target.id)) onChange([...seen, target.id]);
  };

  if (!page) {
    return (
      <div className="flex size-full items-center justify-center rounded-lg border border-border bg-card p-3">
        <p className="text-center text-xs text-muted-foreground">No pages yet.</p>
      </div>
    );
  }

  const first = element.pages[0];
  const startedThisPage = seenSet.has(page.id);

  return (
    <div
      className="flex size-full flex-col gap-2 overflow-hidden rounded-lg border border-border bg-card p-3"
      style={cardStyle(element)}
    >
      <div className="flex shrink-0 items-baseline gap-2">
        <p className="min-w-0 flex-1 truncate font-semibold" style={textStyle(element)}>
          {element.title}
        </p>
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
          {index + 1}/{element.pages.length}
        </span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 rounded-lg bg-muted/30 p-3 text-center">
        {page.imageSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={page.imageSrc} alt="" className="max-h-full min-h-0 flex-1 object-contain" />
        ) : (
          <span className="text-6xl leading-none" aria-hidden>
            {page.emoji || "📖"}
          </span>
        )}
        <p className="max-w-full break-words text-lg" style={textStyle(element)}>
          {page.text}
        </p>
      </div>

      <div className="flex shrink-0 items-center justify-between gap-2">
        <Button
          variant="outline"
          size="sm"
          className="min-h-11"
          disabled={index === 0}
          onClick={() => go(index - 1)}
        >
          Back
        </Button>
        {/* Reaching the first page has to be recorded too, or a child who
            read page one and stopped would show as having read nothing. */}
        {!startedThisPage && index === 0 && first && !locked && (
          <Button size="sm" className="min-h-11" onClick={() => go(0)}>
            Start reading
          </Button>
        )}
        <Button
          size="sm"
          className="min-h-11"
          disabled={index >= element.pages.length - 1}
          onClick={() => go(index + 1)}
        >
          Next page <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

// A picture cut into a grid and shuffled. Tap two pieces to swap them —
// swapping rather than dragging, because dropping a tile precisely is a
// motor task and this is meant to be a visual-reasoning one.
function PuzzlePlayer({
  element,
  order,
  onChange,
  locked,
}: {
  element: Extract<CanvasElement, { type: "puzzle" }>;
  order: number[];
  onChange: (value: number[]) => void;
  locked: boolean;
}) {
  const rows = Math.max(2, Math.min(5, Math.round(element.rows) || 3));
  const cols = Math.max(2, Math.min(5, Math.round(element.cols) || 3));
  const count = rows * cols;

  // The starting arrangement is seeded and deranged, so no piece begins in
  // its own place and the board is identical on the server and the client.
  const start = useMemo(
    () => seededShuffle(Array.from({ length: count }, (_, i) => i), `${element.id}:puzzle`),
    [count, element.id],
  );
  const current = order.length === count ? order : start;
  const [picked, setPicked] = useState<number | null>(null);

  const tap = (position: number) => {
    if (locked) return;
    if (picked === null) {
      setPicked(position);
      return;
    }
    if (picked === position) {
      setPicked(null);
      return;
    }
    const next = [...current];
    [next[picked], next[position]] = [next[position], next[picked]];
    setPicked(null);
    onChange(next);
  };

  const solvedCount = current.filter((piece, i) => piece === i).length;

  return (
    <div
      className="flex size-full flex-col gap-2 overflow-auto rounded-lg border border-border bg-card p-3"
      style={cardStyle(element)}
    >
      <p className="font-semibold" style={textStyle(element)}>
        {element.prompt}
            <SpeakButton text={element.prompt} />
      </p>
      <p className="text-xs text-muted-foreground">
        {solvedCount} of {count} pieces in place
        {picked !== null ? " · now tap the piece to swap it with" : " · tap two pieces to swap them"}
      </p>

      <div
        className="grid aspect-square w-full gap-0.5"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {current.map((piece, position) => {
          // Each cell shows the slice of the picture belonging to `piece`,
          // done with background-position so one image serves every tile
          // rather than slicing it into separate files.
          const pr = Math.floor(piece / cols);
          const pc = piece % cols;
          const home = piece === position;
          return (
            <button
              key={position}
              type="button"
              disabled={locked}
              onClick={() => tap(position)}
              aria-label={`Position ${position + 1}${home ? ", in place" : ""}`}
              className={cn(
                "relative overflow-hidden rounded-sm border-2 transition-colors",
                picked === position && "border-primary",
                picked !== position && home && "border-success/60",
                picked !== position && !home && "border-transparent",
              )}
              style={
                element.imageSrc
                  ? {
                      // Declared even on the photo path so both branches share
                      // one containing block and the emoji fallback below can
                      // size itself against the tile rather than the viewport.
                      containerType: "size",
                      backgroundImage: `url(${element.imageSrc})`,
                      backgroundSize: `${cols * 100}% ${rows * 100}%`,
                      backgroundPosition: `${cols > 1 ? (pc / (cols - 1)) * 100 : 0}% ${
                        rows > 1 ? (pr / (rows - 1)) * 100 : 0
                      }%`,
                    }
                  : { containerType: "size" }
              }
            >
              {/* With no photo the emoji is scaled up and shifted so each
                  tile shows its own part of it — the same trick, without
                  needing an upload. */}
              {!element.imageSrc && (
                <span
                  className="pointer-events-none absolute leading-none"
                  style={{
                    fontSize: `${cols * 100}cqw`,
                    left: `${-pc * 100}%`,
                    top: `${-pr * 100}%`,
                    width: `${cols * 100}%`,
                    height: `${rows * 100}%`,
                  }}
                  aria-hidden
                >
                  {element.emoji || "🧩"}
                </span>
              )}
              <span className="absolute inset-0 bg-muted/10" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Trace the shape behind the pad. The same pointer handling as the drawing
// pad, with a target to follow and a bar to clear — which is what makes it a
// task rather than free drawing.
function TraceGamePlayer({
  element,
  strokes,
  onChange,
  locked,
}: {
  element: Extract<CanvasElement, { type: "traceGame" }>;
  strokes: DrawStroke[];
  onChange: (value: DrawStroke[]) => void;
  locked: boolean;
}) {
  const padRef = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState<DrawStroke | null>(null);

  const pointAt = (e: React.PointerEvent): { x: number; y: number } | null => {
    const box = padRef.current?.getBoundingClientRect();
    if (!box || box.width === 0 || box.height === 0) return null;
    return {
      x: Math.min(1, Math.max(0, (e.clientX - box.left) / box.width)),
      y: Math.min(1, Math.max(0, (e.clientY - box.top) / box.height)),
    };
  };

  const shown = live ? [...strokes, live] : strokes;
  const done = isElementCorrect(element, strokes);

  return (
    <div
      className="flex size-full flex-col gap-2 overflow-hidden rounded-lg border border-border bg-card p-3"
      style={cardStyle(element)}
    >
      <div className="flex shrink-0 items-center gap-2">
        <p className="min-w-0 flex-1 font-semibold" style={textStyle(element)}>
          {element.prompt}
            <SpeakButton text={element.prompt} />
        </p>
        {done && <Check className="size-5 shrink-0 text-success" />}
        <button
          type="button"
          disabled={locked || strokes.length === 0}
          onClick={() => onChange([])}
          aria-label="Start the tracing again"
          title="Start again"
          className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted disabled:opacity-30 cursor-pointer"
        >
          <Eraser className="size-4" />
        </button>
      </div>

      <div
        ref={padRef}
        onPointerDown={(e) => {
          if (locked) return;
          const p = pointAt(e);
          if (!p) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          setLive([p]);
        }}
        onPointerMove={(e) => {
          if (locked || !live) return;
          const p = pointAt(e);
          if (p) setLive([...live, p]);
        }}
        onPointerUp={() => {
          if (!live) return;
          if (live.length >= 2) onChange([...strokes, live]);
          setLive(null);
        }}
        onPointerCancel={() => setLive(null)}
        // container-type is what makes the cqmin below mean "of this pad".
        // Without it the unit resolves against the nearest container — the
        // viewport — and the guide letter rendered 570px tall inside a 300px
        // box, which is to say invisible.
        style={{ containerType: "size" }}
        className={cn(
          "relative min-h-0 flex-1 touch-none select-none overflow-hidden rounded-md border-2 border-dashed border-border bg-white",
          !locked && "cursor-crosshair",
        )}
      >
        {/* The glyph is the guide, drawn faint and behind, sized off the pad
            so it fills whatever box the author gave the element. */}
        <span
          className="pointer-events-none absolute inset-0 flex items-center justify-center font-bold leading-none text-muted-foreground/25"
          style={{ fontSize: "60cqmin" }}
          aria-hidden
        >
          {element.glyph}
        </span>

        <svg
          viewBox="0 0 1 1"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 size-full"
        >
          {shown.map((s, i) => (
            <path
              key={i}
              d={strokePath(s)}
              fill="none"
              stroke={element.strokeColor}
              strokeWidth={element.strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
      </div>

      <p className="shrink-0 text-center text-xs text-muted-foreground">
        {done ? "Nicely traced." : `Trace over the ${element.glyph}.`}
      </p>
    </div>
  );
}

// Two teams taking turns to reveal a card worth points. A motivator rather
// than an assessment — the thing at the end of a hard session that gives a
// reason to get through it — so what is recorded is simply whether the game
// was played through.
function BattleTimePlayer({
  element,
  revealed,
  onChange,
  locked,
}: {
  element: Extract<CanvasElement, { type: "battleTime" }>;
  revealed: string[];
  onChange: (value: string[]) => void;
  locked: boolean;
}) {
  const revealedSet = new Set(revealed);

  // Whose turn it is follows from how many cards have gone, so it survives a
  // refresh without being stored separately — and cannot disagree with the
  // board the way a second piece of state could.
  const turnIsA = revealed.length % 2 === 0;
  const scoreFor = (side: "a" | "b") =>
    revealed
      .filter((_, i) => (i % 2 === 0) === (side === "a"))
      .reduce((sum, id) => sum + (element.cards.find((c) => c.id === id)?.points ?? 0), 0);

  const allDone = revealedSet.size >= element.cards.length;

  return (
    <div
      className="flex size-full flex-col gap-2 overflow-auto rounded-lg border border-border bg-card p-3"
      style={cardStyle(element)}
    >
      <p className="font-semibold" style={textStyle(element)}>
        {element.prompt}
            <SpeakButton text={element.prompt} />
      </p>

      <div className="grid grid-cols-2 gap-2">
        {(["a", "b"] as const).map((side) => {
          const isTurn = !allDone && turnIsA === (side === "a");
          return (
            <div
              key={side}
              className={cn(
                "flex items-center justify-between gap-2 rounded-lg border-2 px-3 py-2",
                isTurn ? "border-primary bg-secondary" : "border-border",
              )}
              style={textStyle(element)}
            >
              <span className="min-w-0 truncate font-semibold">
                {side === "a" ? element.teamA : element.teamB}
              </span>
              <span className="shrink-0 text-lg font-bold tabular-nums">{scoreFor(side)}</span>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        {allDone
          ? "All the cards are turned over."
          : `${turnIsA ? element.teamA : element.teamB}'s turn — tap a card.`}
      </p>

      <div className="grid flex-1 grid-cols-3 content-start gap-2">
        {element.cards.map((card) => {
          const isUp = revealedSet.has(card.id);
          return (
            <button
              key={card.id}
              type="button"
              disabled={locked || isUp}
              onClick={() => onChange([...revealed, card.id])}
              aria-label={isUp ? `${card.label}, worth ${card.points}` : "Face-down card"}
              className={cn(
                "flex aspect-[4/3] min-h-11 flex-col items-center justify-center gap-0.5 rounded-lg border-2 transition-colors",
                isUp ? "border-primary bg-secondary" : "border-border bg-muted hover:bg-muted/70",
              )}
              style={textStyle(element)}
            >
              {isUp ? (
                <>
                  <span className="text-2xl leading-none">{card.label}</span>
                  <span className="text-xs font-semibold tabular-nums">+{card.points}</span>
                </>
              ) : (
                <Swords className="size-5 text-muted-foreground" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
