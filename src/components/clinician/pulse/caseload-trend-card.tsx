import Link from "next/link";
import { TrendingUp, TrendingDown, Minus, LineChart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CountUp } from "@/components/motion/count-up";
import type { CaseloadPulse } from "@/lib/analytics/types";
import { rollingWeekWindows } from "@/lib/analytics/windows";
import { CaseloadTrendChart } from "./caseload-trend-chart";

// A line needs at least two plottable points to read as a trend; one point
// is just a dot. Below this, we show guidance instead of a chart.
const MIN_TREND_POINTS = 2;

// Caseload-wide accuracy: the this-week headline with its week-over-week
// delta (the approved placement — folded into the trend card, not a 5th KPI)
// sitting above the daily trend line. Null accuracy renders as an honest
// "no activity this week" rather than a fabricated 0%.
export function CaseloadTrendCard({ pulse }: { pulse: CaseloadPulse }) {
  const { averageAccuracyThisWeek, accuracyDelta } = pulse;

  // Only chart a trend when there's meaningful RECENT activity — at least
  // two plottable days within the comparison window this card is labeled for
  // ("last 7 days vs previous 7"). Gating on recency (not just total points)
  // means a caseload that was active weeks ago but is quiet now shows the
  // dedicated empty state, never a stale line masquerading as current.
  const { lastWeek } = rollingWeekWindows(new Date(pulse.generatedAt));
  const recentPlottablePoints = pulse.trend.filter(
    (p) => p.averageAccuracy !== null && new Date(p.periodStart) >= lastWeek.start,
  ).length;
  const hasTrend = recentPlottablePoints >= MIN_TREND_POINTS;

  return (
    <Card className="h-full">
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle>Caseload accuracy</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">Last 7 days vs previous 7</p>
        </div>
        {averageAccuracyThisWeek !== null && (
          <div className="text-right">
            <p className="text-2xl font-bold tabular-nums leading-none">
              <CountUp value={averageAccuracyThisWeek} />%
            </p>
            <DeltaBadge delta={accuracyDelta} />
          </div>
        )}
      </CardHeader>
      <CardContent>
        {hasTrend ? <CaseloadTrendChart points={pulse.trend} /> : <TrendEmptyState />}
      </CardContent>
    </Card>
  );
}

// Guides the clinician toward the action that populates this chart, rather
// than only stating there's no data.
function TrendEmptyState() {
  return (
    <div className="flex h-56 flex-col items-center justify-center gap-2 text-center">
      <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <LineChart className="size-5" />
      </span>
      <p className="text-sm font-medium">Not enough activity to chart a trend yet</p>
      <p className="max-w-xs text-xs text-muted-foreground">
        Caseload accuracy appears here once your patients complete a few activities across
        different days.
      </p>
      <Link
        href="/clinician/assignments"
        className="text-xs font-medium text-primary hover:underline"
      >
        Assign an activity →
      </Link>
    </div>
  );
}

function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta === null) {
    return <p className="mt-1 text-xs text-muted-foreground">No prior-week comparison</p>;
  }
  if (delta === 0) {
    return (
      <p className="mt-1 flex items-center justify-end gap-1 text-xs text-muted-foreground">
        <Minus className="size-3" /> No change vs last week
      </p>
    );
  }
  const up = delta > 0;
  return (
    <p
      className={`mt-1 flex items-center justify-end gap-1 text-xs font-medium ${
        up ? "text-emerald-600 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"
      }`}
    >
      {up ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
      {up ? "+" : ""}
      {delta} pts vs last week
    </p>
  );
}
