"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { formatDate } from "@/lib/utils";
import type { TrendPoint } from "@/lib/analytics/types";

// Same visual language as components/charts/progress-chart.tsx (line color,
// themed axes, tooltip) so the caseload trend reads as the same family of
// chart the per-patient view already uses — just fed the analytics layer's
// TrendPoint[] instead of raw attempts. Days with no accuracy-countable
// activity (averageAccuracy === null) are dropped rather than drawn as a
// dip to zero.
const LINE_COLOR = "#3b5544";

export function CaseloadTrendChart({ points }: { points: TrendPoint[] }) {
  const data = points
    .filter((p) => p.averageAccuracy !== null)
    .map((p) => ({ date: formatDate(p.periodStart), accuracy: p.averageAccuracy as number }));

  if (data.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
        No accuracy data in this range yet — the trend appears once patients complete activities.
      </div>
    );
  }

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            axisLine={{ stroke: "var(--border)" }}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            axisLine={false}
            tickLine={false}
            width={36}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(value) => [`${value}%`, "Avg accuracy"]}
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
  );
}
