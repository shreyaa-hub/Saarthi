import { ImageIcon, Volume2, MoveHorizontal, ListOrdered } from "lucide-react";
import type { CanvasElement } from "@/lib/types/canvas";
import { ListBlock, WritingLinesBlock } from "@/components/canvas/worksheet-elements";
import { cn } from "@/lib/utils";

// Static, non-interactive rendering of a canvas element — used by the
// authoring canvas. The activity player has its own interactive renderer.
export function ElementPreview({ element }: { element: CanvasElement }) {
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

    case "multipleChoice":
      return (
        <div className="flex size-full flex-col gap-2 overflow-hidden rounded-lg border border-border bg-card p-3">
          <p className="text-sm font-semibold">{element.prompt}</p>
          <div className="flex flex-1 flex-col gap-1.5 overflow-hidden">
            {element.options.map((o) => (
              <div
                key={o.id}
                className={cn(
                  "truncate rounded-md border px-2 py-1 text-xs",
                  o.correct ? "border-success/40 bg-success/10 text-success" : "border-border",
                )}
              >
                {o.label}
              </div>
            ))}
          </div>
        </div>
      );

    case "fillBlank":
      return (
        <div className="flex size-full flex-col justify-center gap-1 rounded-lg border border-border bg-card p-3">
          <p className="text-sm">
            {element.template.split("___").map((part, i, arr) => (
              <span key={i}>
                {part}
                {i < arr.length - 1 && (
                  <span className="mx-1 inline-block w-16 border-b-2 border-dashed border-primary align-middle" />
                )}
              </span>
            ))}
          </p>
          <p className="text-xs text-muted-foreground">Answer: {element.answer}</p>
        </div>
      );

    case "dragMatch":
      return (
        <div className="flex size-full flex-col gap-2 overflow-hidden rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 text-sm font-semibold">
            <MoveHorizontal className="size-3.5" /> {element.prompt}
          </div>
          <div className="grid flex-1 grid-cols-2 gap-2 overflow-hidden text-xs">
            <div className="flex flex-col gap-1">
              {element.pairs.map((p) => (
                <div key={p.id} className="truncate rounded-md border border-border px-2 py-1">
                  {p.left}
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-1">
              {element.pairs.map((p) => (
                <div key={p.id} className="truncate rounded-md border border-border bg-secondary px-2 py-1">
                  {p.right}
                </div>
              ))}
            </div>
          </div>
        </div>
      );

    case "sequence":
      return (
        <div className="flex size-full flex-col gap-2 overflow-hidden rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 text-sm font-semibold">
            <ListOrdered className="size-3.5" /> {element.prompt}
          </div>
          <div className="flex flex-col gap-1 overflow-hidden text-xs">
            {[...element.items]
              .sort((a, b) => a.order - b.order)
              .map((it, i) => (
                <div key={it.id} className="flex items-center gap-2 truncate rounded-md border border-border px-2 py-1">
                  <span className="font-semibold text-primary">{i + 1}.</span> {it.label}
                </div>
              ))}
          </div>
        </div>
      );

    case "list":
      return <ListBlock element={element} />;

    case "writingLines":
      return <WritingLinesBlock element={element} />;

    default:
      return null;
  }
}
