import { MessageSquare } from "lucide-react";
import { getParentContext } from "@/lib/parent/context";
import { getChildAttempts } from "@/lib/data/parent";
import { buildPatientAnalytics } from "@/lib/analytics/models";
import type { AnalyticsAttempt } from "@/lib/analytics/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressChart } from "@/components/charts/progress-chart";
import { NoChildState } from "@/components/parent/no-child-state";
import { formatDate } from "@/lib/utils";

export default async function ParentProgressPage() {
  const { supabase, child } = await getParentContext();

  if (!child) {
    return (
      <NoChildState
        title="Progress"
        description="Connect to your child to follow their accuracy over time and read their clinician's notes."
      />
    );
  }

  const attempts = await getChildAttempts(supabase, child.childId);
  const firstName = child.name.split(" ")[0];

  // Same builder the clinician's analytics run on — a parent and a clinician
  // must never see two different numbers for the same child.
  const analyticsAttempts: AnalyticsAttempt[] = attempts.map((a) => ({
    patientId: child.childId,
    completedAt: a.completed_at,
    correctCount: a.correct_count,
    totalCount: a.total_count,
    domain: null,
  }));
  const { summary } = buildPatientAnalytics(analyticsAttempts);

  const tiles = [
    { label: "Average accuracy", value: summary.averageAccuracy !== null ? `${summary.averageAccuracy}%` : "—" },
    { label: "This week", value: summary.thisWeekAccuracy !== null ? `${summary.thisWeekAccuracy}%` : "No activity" },
    { label: "Activities completed", value: String(summary.totalCompleted) },
    { label: "Active days", value: String(summary.activeDays) },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-display text-2xl font-semibold">Progress</h2>
        <p className="text-sm text-muted-foreground">
          {firstName}&apos;s accuracy across every completed activity.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((t) => (
          <Card key={t.label}>
            <CardContent className="pt-6">
              <p className="text-2xl font-semibold">{t.value}</p>
              <p className="text-xs text-muted-foreground">{t.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Accuracy over time</CardTitle>
        </CardHeader>
        <CardContent>
          <ProgressChart attempts={attempts} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
        </CardHeader>
        <CardContent>
          {attempts.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Results appear here once {firstName} completes their first activity.
            </p>
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {attempts.map((a) => (
                <div key={a.id} className="flex flex-col gap-2 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">
                        {(a as unknown as { assignments?: { title?: string } }).assignments?.title ?? "Activity"}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatDate(a.completed_at)}</p>
                    </div>
                    <p className="text-sm font-semibold">
                      {a.correct_count}/{a.total_count} ({a.score ?? 0}%)
                    </p>
                  </div>
                  {a.clinician_note && (
                    <p className="flex items-start gap-1.5 rounded-md bg-secondary px-3 py-2 text-xs text-secondary-foreground">
                      <MessageSquare className="mt-0.5 size-3.5 shrink-0" />
                      {a.clinician_note}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
