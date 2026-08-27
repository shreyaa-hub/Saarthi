import type {
  ListElement,
  WritingLinesElement,
  ChecklistElement,
  TableElement,
  ArrowElement,
  DividerElement,
  StickerElement,
  SpeechBubbleElement,
  CalloutElement,
  SheetHeaderElement,
  LetterBoxesElement,
  NumberLineElement,
  RewardStarsElement,
  WordBankElement,
} from "@/lib/types/canvas";

// Shared by the authoring canvas and the activity player. Worksheet elements
// carry no answer key and are never scored, so unlike the interactive types
// there is nothing for the player to render differently — one implementation
// serves both, which also guarantees the printed page matches the preview.

export function ListBlock({ element }: { element: ListElement }) {
  return (
    <ol
      className="flex size-full flex-col overflow-hidden"
      style={{
        gap: element.lineGap,
        fontSize: element.fontSize,
        color: element.color,
        // Reset the browser's own list styling — the marker is drawn below so
        // bullets and numbers share identical alignment and spacing.
        listStyle: "none",
        margin: 0,
        padding: 0,
      }}
    >
      {element.items.map((item, i) => (
        <li key={i} className="flex items-baseline gap-2">
          <span
            aria-hidden
            className="shrink-0 tabular-nums"
            style={{ minWidth: element.ordered ? "1.6em" : "0.9em" }}
          >
            {element.ordered ? `${i + 1}.` : "•"}
          </span>
          <span className="min-w-0 flex-1">{item}</span>
        </li>
      ))}
    </ol>
  );
}

export function WritingLinesBlock({ element }: { element: WritingLinesElement }) {
  const { lines, lineGap, color, guide } = element;

  // Drawn as real vector lines rather than a repeating background image so
  // they stay crisp at any zoom and survive printing at full resolution.
  const rows = Array.from({ length: Math.max(1, lines) }, (_, i) => (i + 1) * lineGap);

  return (
    <svg
      className="size-full"
      viewBox={`0 0 ${element.w} ${Math.max(element.h, rows[rows.length - 1] + 4)}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={`${lines} writing ${lines === 1 ? "line" : "lines"}`}
    >
      {rows.map((y, i) => (
        <g key={i}>
          {guide === "dotted-midline" && (
            <line
              x1={0}
              y1={y - lineGap / 2}
              x2={element.w}
              y2={y - lineGap / 2}
              stroke={color}
              strokeWidth={1}
              strokeDasharray="4 6"
            />
          )}
          <line x1={0} y1={y} x2={element.w} y2={y} stroke={color} strokeWidth={1.5} />
        </g>
      ))}
    </svg>
  );
}

export function ChecklistBlock({ element }: { element: ChecklistElement }) {
  return (
    <ul
      className="flex size-full flex-col overflow-hidden"
      style={{
        gap: element.lineGap,
        fontSize: element.fontSize,
        color: element.color,
        listStyle: "none",
        margin: 0,
        padding: 0,
      }}
    >
      {element.items.map((item, i) => (
        <li key={i} className="flex items-start gap-2">
          {/* A real bordered box rather than a ☐ character: the glyph's size
              and weight vary by installed font, and this has to print at a
              predictable size for someone to tick it with a pen. */}
          <span
            aria-hidden
            className="mt-[0.15em] shrink-0 border"
            style={{
              width: element.boxSize,
              height: element.boxSize,
              borderColor: element.color,
              borderWidth: 1.5,
              borderRadius: 3,
            }}
          />
          <span className="min-w-0 flex-1">{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function TableBlock({ element }: { element: TableElement }) {
  const columns = Math.max(1, ...element.rows.map((r) => r.length));

  return (
    <table
      className="size-full table-fixed"
      style={{
        fontSize: element.fontSize,
        color: element.color,
        // Collapsed so adjacent cells share one ruling line instead of
        // drawing two side by side, which prints as a visibly thicker seam.
        borderCollapse: "collapse",
      }}
    >
      <tbody>
        {element.rows.map((row, r) => (
          <tr key={r}>
            {Array.from({ length: columns }, (_, c) => {
              const isHeader = element.headerRow && r === 0;
              const Cell = isHeader ? "th" : "td";
              return (
                <Cell
                  key={c}
                  scope={isHeader ? "col" : undefined}
                  className="px-1.5 py-1 text-left align-top"
                  style={{
                    border: `1px solid ${element.borderColor}`,
                    fontWeight: isHeader ? 600 : 400,
                  }}
                >
                  {row[c] ?? ""}
                </Cell>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// --- Page furniture ---------------------------------------------------------
// Ten more building blocks, all unscored like the four above, so one
// implementation again serves the authoring canvas, the player and the printed
// sheet. Everything is drawn in SVG or plain boxes rather than as an image, so
// it stays sharp at any zoom and prints at the printer's resolution.

export function ArrowBlock({ element }: { element: ArrowElement }) {
  const { color, thickness, head } = element;
  // Drawn across the middle of whatever box the author dragged out, so
  // rotating the element is what makes a diagonal arrow — there is no second
  // angle field to keep in sync with the handles.
  const y = element.h / 2;
  const cap = Math.max(6, thickness * 3);
  const inset = head === "none" ? 0 : cap;

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${element.w} ${element.h}`} preserveAspectRatio="none">
      <line
        x1={head === "both" ? inset : 0}
        y1={y}
        x2={head === "none" ? element.w : element.w - inset}
        y2={y}
        stroke={color}
        strokeWidth={thickness}
        strokeLinecap="round"
      />
      {(head === "end" || head === "both") && (
        <polygon
          points={`${element.w},${y} ${element.w - cap},${y - cap * 0.6} ${element.w - cap},${y + cap * 0.6}`}
          fill={color}
        />
      )}
      {head === "both" && (
        <polygon points={`0,${y} ${cap},${y - cap * 0.6} ${cap},${y + cap * 0.6}`} fill={color} />
      )}
    </svg>
  );
}

export function DividerBlock({ element }: { element: DividerElement }) {
  return (
    <div className="flex size-full items-center">
      <div
        className="w-full"
        style={{
          borderTopWidth: element.thickness,
          borderTopStyle: element.style,
          borderTopColor: element.color,
        }}
      />
    </div>
  );
}

export function StickerBlock({ element }: { element: StickerElement }) {
  return (
    <div className="flex size-full items-center justify-center overflow-hidden">
      {/* Sized off the element's own box rather than a font-size field, so
          resizing the sticker on the canvas is what makes it bigger — which
          is what the drag handles already imply. */}
      <span
        className="leading-none"
        style={{ fontSize: Math.min(element.w, element.h) * 0.8 }}
      >
        {element.emoji}
      </span>
    </div>
  );
}

export function SpeechBubbleBlock({ element }: { element: SpeechBubbleElement }) {
  const tailW = 18;
  const bodyH = Math.max(10, element.h - tailW);

  return (
    <div className="relative size-full">
      <div
        className="flex items-center justify-center overflow-hidden p-3 text-center"
        style={{
          height: bodyH,
          background: element.fill,
          color: element.color,
          fontSize: element.fontSize,
          // A thought bubble is a cloud; a speech bubble is a rounded box.
          // The difference is the whole visual cue for "said" vs "thought",
          // which is the distinction a social story turns on.
          borderRadius: element.thought ? "50% / 40%" : 16,
        }}
      >
        <span className="whitespace-pre-wrap break-words">{element.text}</span>
      </div>

      {element.tail !== "none" &&
        (element.thought ? (
          // Thought tails are a trail of shrinking circles, not a spike.
          <div
            className="absolute flex flex-col items-center gap-0.5"
            style={{ top: bodyH, [element.tail]: 24 } as React.CSSProperties}
          >
            <span
              className="block rounded-full"
              style={{ width: 10, height: 10, background: element.fill }}
            />
            <span
              className="block rounded-full"
              style={{ width: 6, height: 6, background: element.fill }}
            />
          </div>
        ) : (
          <svg
            className="absolute"
            width={tailW}
            height={tailW}
            style={{ top: bodyH - 1, [element.tail]: 24 } as React.CSSProperties}
          >
            <polygon points={`0,0 ${tailW},0 ${element.tail === "left" ? 2 : tailW - 2},${tailW}`} fill={element.fill} />
          </svg>
        ))}
    </div>
  );
}

const CALLOUT_TONES: Record<CalloutElement["tone"], { bg: string; border: string; text: string }> = {
  // Literal colours, not theme tokens: these are written into the stored
  // canvas and printed, so they must survive dark mode and a black-and-white
  // printer rather than resolving against whatever theme is loaded.
  note: { bg: "#f3f0ff", border: "#c4b5fd", text: "#4c1d95" },
  tip: { bg: "#ecfdf5", border: "#6ee7b7", text: "#065f46" },
  warning: { bg: "#fffbeb", border: "#fcd34d", text: "#78350f" },
};

export function CalloutBlock({ element }: { element: CalloutElement }) {
  const tone = CALLOUT_TONES[element.tone] ?? CALLOUT_TONES.note;
  return (
    <div
      className="flex size-full flex-col gap-1 overflow-hidden rounded-lg border-l-4 p-3"
      style={{
        background: tone.bg,
        borderLeftColor: tone.border,
        color: tone.text,
        fontSize: element.fontSize,
      }}
    >
      {element.title && <p className="font-semibold">{element.title}</p>}
      <p className="whitespace-pre-wrap break-words">{element.body}</p>
    </div>
  );
}

export function SheetHeaderBlock({ element }: { element: SheetHeaderElement }) {
  return (
    <div
      className="flex size-full items-end gap-6 overflow-hidden"
      style={{ fontSize: element.fontSize, color: element.color }}
    >
      {element.fields.map((field, i) => (
        <div key={i} className="flex min-w-0 flex-1 items-end gap-2">
          <span className="shrink-0 whitespace-nowrap">{field}</span>
          {/* The rule stretches, the label does not, so a long field name
              never squeezes its own line down to nothing. */}
          <span className="min-w-0 flex-1 border-b" style={{ borderColor: element.color }} />
        </div>
      ))}
    </div>
  );
}

export function LetterBoxesBlock({ element }: { element: LetterBoxesElement }) {
  const letters = [...element.word];
  return (
    <div className="flex size-full flex-wrap items-center gap-1.5 overflow-hidden">
      {letters.map((ch, i) =>
        // A space in the word is a gap between words, not a box to write in.
        ch === " " ? (
          <span key={i} style={{ width: element.boxSize / 2 }} />
        ) : (
          <span
            key={i}
            className="flex items-center justify-center rounded border-2"
            style={{
              width: element.boxSize,
              height: element.boxSize,
              borderColor: element.color,
              fontSize: element.boxSize * 0.55,
              // Faint, not absent: tracing needs to see the letter, and
              // recall needs the box empty.
              color: element.showLetters ? element.color : "transparent",
              opacity: element.showLetters ? 0.35 : 1,
            }}
          >
            {ch}
          </span>
        ),
      )}
    </div>
  );
}

export function NumberLineBlock({ element }: { element: NumberLineElement }) {
  const { from, to, color, fontSize } = element;
  // Guarded so a step of 0 or a reversed range cannot spin forever or divide
  // by zero — both are one keystroke away in the number fields.
  const step = Math.max(1, Math.abs(Math.round(element.step)) || 1);
  const span = Math.abs(to - from);
  const ticks = Math.min(60, Math.floor(span / step)) + 1;
  const values = Array.from({ length: ticks }, (_, i) => from + i * step * (to < from ? -1 : 1));

  // Every label is centred on its own tick, so the first and last ones hang
  // half their width past the ends of the line. Without room reserved for
  // that overhang they were clipped by the element's edge: measured, a line
  // from 0 to 10 printed its ends as ")" and "1". The inset is sized from the
  // longest label actually on the line rather than a fixed guess, so a line
  // running to 100 gets the room it needs and one running to 5 does not waste
  // it.
  const widestLabel = values.reduce((n, v) => Math.max(n, String(v).length), 1);
  const inset = (widestLabel * fontSize) / 2;

  return (
    <div className="flex size-full flex-col justify-center overflow-hidden">
      <div className="relative w-full" style={{ height: fontSize * 2.4, paddingInline: inset }}>
        <div className="relative size-full">
          <div
            className="absolute left-0 right-0"
            style={{ top: "40%", borderTopWidth: 2, borderTopColor: color, borderTopStyle: "solid" }}
          />
          {values.map((v, i) => {
            const pct = values.length === 1 ? 0 : (i / (values.length - 1)) * 100;
            return (
              <div
                key={i}
                className="absolute flex -translate-x-1/2 flex-col items-center"
                style={{ left: `${pct}%`, top: "40%" }}
              >
                <span style={{ width: 2, height: 8, background: color }} />
                <span style={{ color, fontSize }} className="mt-0.5 tabular-nums">
                  {v}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function RewardStarsBlock({ element }: { element: RewardStarsElement }) {
  // Capped so a mistyped total cannot render a thousand stars.
  const total = Math.max(1, Math.min(30, Math.round(element.total)));
  const earned = Math.max(0, Math.min(total, Math.round(element.earned)));
  const size = Math.min(48, Math.max(18, element.h - (element.label ? 24 : 8)));

  return (
    <div className="flex size-full flex-col justify-center gap-1 overflow-hidden">
      {element.label && (
        <p className="truncate text-sm font-medium" style={{ color: element.color }}>
          {element.label}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-1">
        {Array.from({ length: total }, (_, i) => (
          <svg key={i} width={size} height={size} viewBox="0 0 24 24" aria-hidden>
            {/* Earned stars are filled; the rest are outlines to colour in,
                which is what makes this work on paper as well as on screen. */}
            <polygon
              points="12,2 15,9 22,9.5 16.5,14 18.5,21 12,17 5.5,21 7.5,14 2,9.5 9,9"
              fill={i < earned ? element.color : "none"}
              stroke={element.color}
              strokeWidth={1.5}
              strokeLinejoin="round"
            />
          </svg>
        ))}
      </div>
      <span className="sr-only">
        {earned} of {total} earned
      </span>
    </div>
  );
}

export function WordBankBlock({ element }: { element: WordBankElement }) {
  return (
    <div
      className="flex size-full flex-col gap-2 overflow-hidden rounded-lg border-2 p-3"
      style={{ borderColor: element.borderColor, color: element.color, fontSize: element.fontSize }}
    >
      {element.title && <p className="shrink-0 font-semibold">{element.title}</p>}
      <div className="flex flex-wrap content-start gap-x-4 gap-y-1.5 overflow-hidden">
        {element.words.map((w, i) => (
          <span key={i}>{w}</span>
        ))}
      </div>
    </div>
  );
}
