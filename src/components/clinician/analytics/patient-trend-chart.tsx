"use client";

import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { cn, formatDate } from "@/lib/utils";
import type { TrendPoint } from "@/lib/analytics/types";

// Same line language as the other charts in the app (color, themed axes,
// tooltip), with the corrected Y-axis (full percentages, not a clipped "%").
const LINE_COLOR = "#7c3aed";

type Mode = "attempt" | "week";

// The accuracy-over-time chart, retained from the per-patient view and
// improved with a granularity toggle: "Per attempt" is the familiar
// fine-grained view; "Weekly" smooths into the long-term trend. Both series
// are precomputed server-side (via the analytics trend builder) and passed
// in — this component only switches which one it draws.
export function PatientTrendChart({
  attemptSeries,
  weeklySeries,
}: {
  attemptSeries: TrendPoint[];
  weeklySeries: TrendPoint[];
}) {
  const [mode, setMode] = useState<Mode>("attempt");
  const series = mode === "attempt" ? attemptSeries : weeklySeries;
  const data = series
    .filter((p) => p.averageAccuracy !== null)
    .map((p) => ({ date: formatDate(p.periodStart), accuracy: p.averageAccuracy as number }));

  return (
    // NOTE: the chart wrapper below is deliberately NOT a flex child — a
    // recharts ResponsiveContainer inside a flex column reads its parent's
    // height as 0 during flex layout and renders blank. Keeping it in a plain
    // block box with a definite height avoids that.
    <div>
      <div className="mb-3 flex justify-end">
        <div className="inline-flex rounded-lg border border-border p-0.5 text-xs">
          {(["attempt", "week"] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              onClick={() => setMode(m)}
              className={cn(
                "rounded-md px-2.5 py-1 font-medium transition-colors",
                mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {m === "attempt" ? "Per attempt" : "Weekly"}
            </button>
          ))}
        </div>
      </div>

      {data.length < 2 ? (
        <div className="flex h-56 items-center justify-center text-center text-sm text-muted-foreground">
          {mode === "week"
            ? "Not enough weeks of activity yet to show a weekly trend."
            : "Not enough completed activities yet to plot a trend."}
        </div>
      ) : (
        <div className="w-full">
          <ResponsiveContainer width="100%" height={224}>
            <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                axisLine={{ stroke: "var(--border)" }}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                width={44}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(value) => [`${value}%`, mode === "week" ? "Weekly avg" : "Accuracy"]}
              />
              <Line
                type="monotone"
                dataKey="accuracy"
                stroke={LINE_COLOR}
                strokeWidth={2}
                dot={{ r: 3, fill: LINE_COLOR, strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
