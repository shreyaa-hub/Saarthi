import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { PatientActivitySummary as Summary, StatusResult } from "@/lib/analytics/types";
import { STATUS_META } from "@/components/clinician/pulse/status-meta";

// The at-a-glance answer to "how is this patient progressing?" — the current
// status with its plain-language reason, a small grid of headline figures,
// and (when there's enough signal) the strongest domain and the domain to
// focus on. Reuses the same status colour vocabulary as Clinical Pulse.
export function PatientActivitySummary({
  summary,
  status,
}: {
  summary: Summary;
  status: StatusResult;
}) {
  const meta = STATUS_META[status.status];

  const tiles: { label: string; value: string; sub?: string }[] = [
    {
      label: "Avg accuracy",
      value: summary.averageAccuracy !== null ? `${summary.averageAccuracy}%` : "—",
    },
    {
      label: "This week",
      value: summary.thisWeekAccuracy !== null ? `${summary.thisWeekAccuracy}%` : "—",
      sub:
        summary.accuracyDelta !== null
          ? `${summary.accuracyDelta > 0 ? "+" : ""}${summary.accuracyDelta} pts vs last`
          : undefined,
    },
    { label: "Activities", value: String(summary.totalCompleted) },
    { label: "Active days", value: String(summary.activeDays) },
  ];

  const strongest = summary.strongestDomain;
  const weakest = summary.weakestDomain;
  const showWeakest = weakest && weakest.domain !== strongest?.domain;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance summary</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-start gap-2">
          <span className={cn("mt-1 size-2.5 shrink-0 rounded-full", meta.dot)} aria-hidden />
          <div className="min-w-0">
            <p className={cn("text-sm font-medium", meta.text)}>{meta.label}</p>
            <p className="text-xs text-muted-foreground">{status.reason}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {tiles.map((t) => (
            <div key={t.label} className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-xl font-bold tabular-nums leading-none">{t.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t.label}</p>
              {t.sub && <p className="mt-0.5 text-[11px] text-muted-foreground">{t.sub}</p>}
            </div>
          ))}
        </div>

        {(strongest || showWeakest) && (
          <div className="flex flex-col gap-1.5 border-t border-border pt-3 text-sm">
            {strongest && (
              <p className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Strongest domain</span>
                <span className="font-medium">
                  {strongest.domain} · {strongest.averageAccuracy}%
                </span>
              </p>
            )}
            {showWeakest && weakest && (
              <p className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Focus area</span>
                <span className="font-medium">
                  {weakest.domain} · {weakest.averageAccuracy}%
                </span>
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
