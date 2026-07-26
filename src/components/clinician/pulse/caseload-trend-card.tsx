import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CountUp } from "@/components/motion/count-up";
import type { CaseloadPulse } from "@/lib/analytics/types";
import { CaseloadTrendChart } from "./caseload-trend-chart";

// Caseload-wide accuracy: the this-week headline with its week-over-week
// delta (the approved placement — folded into the trend card, not a 5th KPI)
// sitting above the daily trend line. Null accuracy renders as an honest
// "no activity this week" rather than a fabricated 0%.
export function CaseloadTrendCard({ pulse }: { pulse: CaseloadPulse }) {
  const { averageAccuracyThisWeek, accuracyDelta } = pulse;

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
        {averageAccuracyThisWeek === null && (
          <p className="mb-2 text-sm text-muted-foreground">
            No completed activities this week yet.
          </p>
        )}
        <CaseloadTrendChart points={pulse.trend} />
      </CardContent>
    </Card>
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
