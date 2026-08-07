"use client";

import { useState } from "react";
import { Volume2, Check, X } from "lucide-react";
import type { CanvasElement } from "@/lib/types/canvas";
import { isElementCorrect } from "@/lib/scoring";
import { ListBlock, WritingLinesBlock } from "@/components/canvas/worksheet-elements";
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
                  "rounded-md border px-2 py-1.5 text-left transition-colors",
                  activeLeft === p.id && "border-primary bg-secondary",
                  isMatched && !locked && "border-primary/60",
                  isCorrect && "border-success bg-success/10",
                  isWrong && "border-destructive bg-destructive/10",
                  !isMatched && activeLeft !== p.id && "border-border hover:bg-muted",
                )}
              >
                {p.left}
                {isMatched && !locked && " ✓"}
              </button>
            );
          })}
        </div>
        <div className="flex flex-col gap-1.5">
          {[...element.pairs]
            .map((p) => p.right)
            .map((right, idx) => {
              const pairId = element.pairs[idx].id;
              const takenBy = Object.entries(pairs).find(([, r]) => r === pairId)?.[0];
              return (
                <button
                  key={pairId}
                  type="button"
                  disabled={locked || Boolean(takenBy)}
                  onClick={() => pickRight(pairId)}
                  className={cn(
                    "rounded-md border px-2 py-1.5 text-left transition-colors",
                    takenBy ? "border-primary/60 bg-secondary" : "border-border hover:bg-muted",
                  )}
                >
                  {right}
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
