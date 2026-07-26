import type { TrendPoint } from "@/lib/analytics/types";
import { formatDate } from "@/lib/utils";
import { ReportSection } from "./report-section";

// Deliberately NOT the recharts-based PatientTrendChart. That component is
// "use client", carries an interactive toggle a static document has no use
// for, and sizes itself at runtime via ResponsiveContainer/ResizeObserver —
// a real reliability risk in a print/PDF pipeline (this exact chart went
// blank under different runtime conditions earlier in this project). This
// is a small, dependency-free, deterministic inline SVG: fixed viewBox, no
// client JS, no measurement step, so it renders identically in the browser
// preview and in the printed/exported output.
const WIDTH = 680;
const HEIGHT = 160;
const PADDING_X = 32;
const PADDING_Y = 16;
const GRID_LINES = [0, 25, 50, 75, 100];

type PlottablePoint = TrendPoint & { averageAccuracy: number };

export function ReportTrendChart({ points }: { points: TrendPoint[] }) {
  const plottable: PlottablePoint[] = points.filter(
    (p): p is PlottablePoint => p.averageAccuracy !== null,
  );

  return (
    <ReportSection title="Progress trend — weekly average accuracy">
      {plottable.length < 2 ? (
        <p className="text-sm text-gray-500">Not enough activity yet to chart a trend.</p>
      ) : (
        <>
          <TrendSvg points={plottable} />
          <p className="mt-2 text-xs text-gray-500">
            {formatDate(plottable[0].periodStart)} – {formatDate(plottable[plottable.length - 1].periodStart)}
          </p>
        </>
      )}
    </ReportSection>
  );
}

function TrendSvg({ points }: { points: PlottablePoint[] }) {
  const innerWidth = WIDTH - PADDING_X * 2;
  const innerHeight = HEIGHT - PADDING_Y * 2;
  const stepX = points.length > 1 ? innerWidth / (points.length - 1) : 0;

  const coords = points.map((p, i) => ({
    x: PADDING_X + i * stepX,
    y: PADDING_Y + innerHeight * (1 - p.averageAccuracy / 100),
  }));
  const path = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(" ");

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="h-40 w-full"
      role="img"
      aria-label={`Weekly average accuracy trend, from ${points[0].averageAccuracy}% to ${points[points.length - 1].averageAccuracy}%`}
    >
      {GRID_LINES.map((g) => {
        const y = PADDING_Y + innerHeight * (1 - g / 100);
        return (
          <g key={g}>
            <line x1={PADDING_X} y1={y} x2={WIDTH - PADDING_X} y2={y} stroke="#e5e7eb" strokeWidth={1} />
            <text x={0} y={y + 3} fontSize={10} fill="#6b7280">
              {g}%
            </text>
          </g>
        );
      })}
      <path d={path} fill="none" stroke="#111827" strokeWidth={1.75} />
      {coords.map((c, i) => (
        <circle key={i} cx={c.x} cy={c.y} r={2.25} fill="#111827" />
      ))}
    </svg>
  );
}
