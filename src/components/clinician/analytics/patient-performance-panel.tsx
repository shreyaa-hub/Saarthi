import { LineChart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PatientAnalytics, TrendPoint } from "@/lib/analytics/types";
import type { Database } from "@/lib/types/database";
import { PatientActivitySummary } from "./patient-activity-summary";
import { PatientDomainBreakdown } from "./patient-domain-breakdown";
import { PatientTrendChart } from "./patient-trend-chart";
import { AiInsightsTrigger } from "@/components/clinician/ai-insights-trigger";

type Insight = Database["public"]["Tables"]["ai_insights"]["Row"];

// Performance Analytics for one patient: the activity summary (with the AI
// insights trigger folded into its header — see AiInsightsTrigger's comment
// for why AI no longer gets a permanent section), the accuracy-over-time
// trend (with a weekly long-term view), and the per-domain breakdown — all
// rendering the buildPatientAnalytics model, nothing recomputed here. When
// the patient has no completed activities at all, one guiding empty card
// stands in for the whole panel rather than four empty cards stacked (AI
// insights genuinely has nothing to offer with zero attempts either, so it's
// correctly absent from this branch too, not just hidden).
export function PatientPerformancePanel({
  analytics,
  weeklyTrend,
  clinicianPatientId,
  patientId,
  initialInsight,
  attemptCount,
}: {
  analytics: PatientAnalytics;
  weeklyTrend: TrendPoint[];
  clinicianPatientId: string;
  patientId: string | null;
  initialInsight: Insight | null;
  attemptCount: number;
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
      <PatientActivitySummary
        summary={analytics.summary}
        status={analytics.status}
        // AI insights are optional and off unless a key is configured. This
        // is a Server Component, so the check happens on the server and the
        // trigger is simply never sent to the browser — rather than shipping
        // a button that always fails. A deployment without the key gets a
        // product with one fewer feature, not a visibly broken one.
        headerAction={
          process.env.ANTHROPIC_API_KEY ? (
            <AiInsightsTrigger
              clinicianPatientId={clinicianPatientId}
              patientId={patientId}
              initialInsight={initialInsight}
              attemptCount={attemptCount}
            />
          ) : null
        }
      />

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
