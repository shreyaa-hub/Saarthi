"use client";

import { useMemo, useState } from "react";
import { Volume2, Check, X, Brain } from "lucide-react";
import type { CanvasElement } from "@/lib/types/canvas";
import { isElementCorrect } from "@/lib/scoring";
import { ListBlock, WritingLinesBlock } from "@/components/canvas/worksheet-elements";
import { shuffle } from "@/lib/canvas/shuffle";
import { tokenizeWordHunt, isWordToken, targetTokenIndices } from "@/lib/canvas/word-hunt";
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
        <div className="flex size-full flex-col gap-2 overflow-auto rounded-lg border border-border bg-card p-3">
          <p className="text-sm font-semibold">{element.prompt}</p>
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
                  className={cn(
                    "flex items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors",
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

  return (
    <div className="flex size-full flex-col gap-2 overflow-auto rounded-lg border border-border bg-card p-3">
      <p className="text-sm font-semibold">{element.prompt}</p>
      <div className="grid flex-1 grid-cols-2 gap-3 text-sm">
        <div className="flex flex-col gap-1.5">
          {element.pairs.map((p) => {
            const isMatched = Boolean(pairs[p.id]);
            const isCorrect = locked && pairs[p.id] === p.id;
            const isWrong = locked && isMatched && pairs[p.id] !== p.id;
            return (
              <button
                key={p.id}
                type="button"
                disabled={locked}
                onClick={() => pickLeft(p.id)}
                className={cn(
                  "flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-left transition-colors",
                  activeLeft === p.id && "border-primary bg-secondary",
                  isMatched && !locked && "border-primary/60",
                  isCorrect && "border-success bg-success/10",
                  isWrong && "border-destructive bg-destructive/10",
                  !isMatched && activeLeft !== p.id && "border-border hover:bg-muted",
                )}
              >
                {p.leftImage && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.leftImage} alt="" className="size-6 shrink-0 rounded object-cover" />
                )}
                <span className="truncate">{p.left}</span>
                {isMatched && !locked && " ✓"}
              </button>
            );
          })}
        </div>
        <div className="flex flex-col gap-1.5">
          {element.pairs.map((p) => {
            const takenBy = Object.entries(pairs).find(([, r]) => r === p.id)?.[0];
            return (
              <button
                key={p.id}
                type="button"
                disabled={locked || Boolean(takenBy)}
                onClick={() => pickRight(p.id)}
                className={cn(
                  "flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-left transition-colors",
                  takenBy ? "border-primary/60 bg-secondary" : "border-border hover:bg-muted",
                )}
              >
                {p.rightImage && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.rightImage} alt="" className="size-6 shrink-0 rounded object-cover" />
                )}
                <span className="truncate">{p.right}</span>
              </button>
            );
          })}
        </div>
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

  return (
    <div className="flex size-full flex-col gap-2 overflow-auto rounded-lg border border-border bg-card p-3">
      <p className="text-sm font-semibold">{element.prompt}</p>
      <div className="flex flex-col gap-1.5">
        {element.items.map((item) => {
          const position = order.indexOf(item.id);
          return (
            <button
              key={item.id}
              type="button"
              disabled={locked}
              onClick={() => toggle(item.id)}
              className={cn(
                "flex items-center gap-2 rounded-md border px-2 py-1.5 text-left text-sm transition-colors",
                position >= 0 ? "border-primary bg-secondary" : "border-border hover:bg-muted",
              )}
            >
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                {position >= 0 ? position + 1 : ""}
              </span>
              {item.label}
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

  return (
    <div className="flex size-full flex-col gap-2 overflow-auto rounded-lg border border-border bg-card p-3">
      <p className="text-sm font-semibold">{element.prompt}</p>

      {unplaced.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {unplaced.map((it) => (
            <button
              key={it.id}
              type="button"
              disabled={locked}
              onClick={() => pickItem(it.id)}
              className={cn(
                "rounded-md border px-2 py-1 text-xs transition-colors",
                activeItem === it.id ? "border-primary bg-secondary" : "border-border hover:bg-muted",
              )}
            >
              {it.label}
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
          const acceptsDrop = Boolean(activeItem) && !locked;
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
              className={cn(
                "flex flex-col gap-1 rounded-md border border-dashed p-2 text-left",
                acceptsDrop ? "cursor-pointer border-primary/60 hover:bg-secondary" : "border-border",
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
                    onClick={(e) => {
                      e.stopPropagation();
                      pickItem(it.id);
                    }}
                    className={cn(
                      "rounded-md border px-2 py-1 text-left text-xs transition-colors",
                      correct && "border-success bg-success/10 text-success",
                      wrong && "border-destructive bg-destructive/10 text-destructive",
                      !locked && "border-primary/60 bg-secondary hover:bg-muted",
                    )}
                  >
                    {it.label}
                    {correct && <Check className="ml-1 inline size-3 text-success" />}
                    {wrong && <X className="ml-1 inline size-3 text-destructive" />}
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
  // Shuffled once per mount, not on every render: element.pairs comes from
  // the template's frozen canvas_snapshot and is a stable reference for the
  // lifetime of one attempt, so this genuinely runs once per play session —
  // the way a real deck of cards is shuffled once at the start of a game,
  // not reshuffled between every move.
  const cards = useMemo(
    () =>
      shuffle(
        element.pairs.flatMap((p) => [
          { id: `${p.id}-a`, pairKey: p.id, label: p.label, image: p.image },
          { id: `${p.id}-b`, pairKey: p.id, label: p.label, image: p.image },
        ]),
      ),
    [element.pairs],
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
    <div className="flex size-full flex-col gap-2 overflow-auto rounded-lg border border-border bg-card p-3">
      <p className="text-sm font-semibold">{element.prompt}</p>
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
              className={cn(
                "flex aspect-square flex-col items-center justify-center gap-1 rounded-md border p-1.5 text-center text-xs transition-colors",
                isMatchedCard && "border-success bg-success/10",
                !isMatchedCard && revealed && "border-primary bg-secondary",
                !revealed && "border-border bg-muted hover:bg-muted/70",
              )}
            >
              {revealed ? (
                <>
                  {c.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.image} alt="" className="size-6 rounded object-cover" />
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
