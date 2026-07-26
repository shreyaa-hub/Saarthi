import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { DomainStat, PatientActivitySummary as Summary, StatusResult } from "@/lib/analytics/types";
import { STATUS_META } from "@/components/clinician/pulse/status-meta";

function completedActivities(n: number) {
  return `${n} completed ${n === 1 ? "activity" : "activities"}`;
}

// The at-a-glance answer to "how is this patient progressing?" — the current
// status with its plain-language reason, a small grid of headline figures,
// and (when there's enough signal) the strongest domain and the domain to
// focus on. Reuses the same status colour vocabulary as Clinical Pulse.
export function PatientActivitySummary({
  summary,
  status,
  headerAction,
}: {
  summary: Summary;
  status: StatusResult;
  headerAction?: React.ReactNode;
}) {
  const meta = STATUS_META[status.status];

  // "Avg accuracy" is the mean across every completed activity (lifetime),
  // labelled "All-time" so the figure can't be mistaken for a recent window.
  const tiles: { label: string; value: string; sub?: string }[] = [
    {
      label: "Avg accuracy",
      value: summary.averageAccuracy !== null ? `${summary.averageAccuracy}%` : "N/A",
      sub: "All-time",
    },
    {
      label: "This week",
      value: summary.thisWeekAccuracy !== null ? `${summary.thisWeekAccuracy}%` : "No activity",
      sub:
        summary.accuracyDelta !== null
          ? `${summary.accuracyDelta > 0 ? "+" : ""}${summary.accuracyDelta} pts vs last`
          : undefined,
    },
    { label: "Activities", value: String(summary.totalCompleted), sub: "All-time" },
    { label: "Active days", value: String(summary.activeDays), sub: "All-time" },
  ];

  const strongest = summary.strongestDomain;
  const weakest = summary.weakestDomain;
  const showWeakest = weakest && weakest.domain !== strongest?.domain;

  return (
    <Card>
      <CardHeader className={headerAction ? "flex-row items-start justify-between space-y-0" : undefined}>
        <CardTitle>Performance summary</CardTitle>
        {headerAction}
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
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
              <p className="mt-1.5 text-xs text-muted-foreground">{t.label}</p>
              {t.sub && <p className="mt-0.5 text-[11px] text-muted-foreground/80">{t.sub}</p>}
            </div>
          ))}
        </div>

        {(strongest || showWeakest) && (
          <div className="flex flex-col gap-3 border-t border-border pt-5 text-sm">
            {strongest && <DomainLine label="Strongest domain" domain={strongest} />}
            {showWeakest && weakest && <DomainLine label="Focus area" domain={weakest} />}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DomainLine({ label, domain }: { label: string; domain: DomainStat }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">
        <span className="block font-medium">{domain.domain}</span>
        <span className="block text-xs text-muted-foreground">
          {domain.averageAccuracy}% accuracy · {completedActivities(domain.completedCount)}
        </span>
      </span>
    </div>
  );
}
