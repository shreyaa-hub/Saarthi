"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { buildTrend, type AnalyticsAttempt } from "@/lib/analytics";
import { formatDate } from "@/lib/utils";

const LINE_COLOR = "#7c3aed";

type Attempt = {
  id: string;
  completed_at: string;
  correct_count: number;
  total_count: number;
};

// Accuracy over time, built through the analytics layer rather than from
// arithmetic of its own. That fixed two things this chart got wrong on its
// own:
//
// The line ran backwards. Both fetchers order attempts newest-first — right
// for the history list underneath, wrong for a time axis — and the chart
// plotted them in array order, so a patient steadily improving saw a line
// that appeared to be falling. buildTrend sorts chronologically.
//
// An attempt with nothing scorable plotted as 0%. submitAttempt records that
// case as 100%, so the same attempt read 100% in the history list and dropped
// the chart line to the floor right beside it. buildTrend returns null for
// those, which is drawn as a gap — the patient did the work, there is just no
// accuracy to state.
export function ProgressChart({ attempts }: { attempts: Attempt[] }) {
  if (attempts.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
        No attempts yet — data will appear here after the first completed activity.
      </div>
    );
  }

  const normalized: AnalyticsAttempt[] = attempts.map((a) => ({
    patientId: "",
    completedAt: a.completed_at,
    correctCount: a.correct_count,
    totalCount: a.total_count,
    domain: null,
  }));

  const data = buildTrend(normalized, "attempt").map((point) => ({
    date: formatDate(point.periodStart),
    accuracy: point.averageAccuracy,
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
            // A null accuracy is a real gap in the record, not a point to
            // bridge over: joining across it would draw a trend line through
            // an activity that had nothing to measure.
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
