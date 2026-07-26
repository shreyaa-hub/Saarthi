import { LineChart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PatientAnalytics, TrendPoint } from "@/lib/analytics/types";
import { PatientActivitySummary } from "./patient-activity-summary";
import { PatientDomainBreakdown } from "./patient-domain-breakdown";
import { PatientTrendChart } from "./patient-trend-chart";

// Performance Analytics for one patient: the activity summary, the
// accuracy-over-time trend (with a weekly long-term view), and the per-domain
// breakdown — all rendering the buildPatientAnalytics model, nothing
// recomputed here. When the patient has no completed activities at all, one
// guiding empty card stands in for the whole panel rather than three empty
// cards stacked.
export function PatientPerformancePanel({
  analytics,
  weeklyTrend,
}: {
  analytics: PatientAnalytics;
  weeklyTrend: TrendPoint[];
}) {
  if (analytics.summary.totalCompleted === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <LineChart className="size-5" />
            </span>
            <p className="text-sm font-medium">No completed activities yet</p>
            <p className="max-w-xs text-xs text-muted-foreground">
              Once this patient completes an assigned activity, their accuracy trend, domain
              breakdown, and progress summary appear here.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <PatientActivitySummary summary={analytics.summary} status={analytics.status} />

      <Card>
        <CardHeader>
          <CardTitle>Accuracy over time</CardTitle>
        </CardHeader>
        <CardContent>
          <PatientTrendChart attemptSeries={analytics.trend} weeklySeries={weeklyTrend} />
        </CardContent>
      </Card>

      <PatientDomainBreakdown domains={analytics.domains} />
    </>
  );
}
