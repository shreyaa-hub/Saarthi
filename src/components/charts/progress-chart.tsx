"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { formatDate } from "@/lib/utils";

const LINE_COLOR = "#7c3aed";

type Attempt = {
  id: string;
  completed_at: string;
  correct_count: number;
  total_count: number;
};

export function ProgressChart({ attempts }: { attempts: Attempt[] }) {
  if (attempts.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
        No attempts yet — data will appear here after the first completed activity.
      </div>
    );
  }

  const data = attempts.map((a) => ({
    date: formatDate(a.completed_at),
    accuracy: a.total_count > 0 ? Math.round((a.correct_count / a.total_count) * 100) : 0,
  }));

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        {/* left margin 0 + a wider YAxis so tick labels aren't clipped to a
            bare "%" (a negative left margin cut off the digits). */}
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
            formatter={(value) => [`${value}%`, "Accuracy"]}
          />
          <Line
            type="monotone"
            dataKey="accuracy"
            stroke={LINE_COLOR}
            strokeWidth={2}
            dot={{ r: 4, fill: LINE_COLOR, strokeWidth: 0 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
