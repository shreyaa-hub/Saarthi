import type {
  ListElement,
  WritingLinesElement,
  ChecklistElement,
  TableElement,
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
