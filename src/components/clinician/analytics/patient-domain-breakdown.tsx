import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DomainStat } from "@/lib/analytics/types";

function activityCount(n: number) {
  return `${n} ${n === 1 ? "activity" : "activities"}`;
}

// Accuracy per therapy domain, shown as a simple horizontal bar list (the
// same lightweight bar treatment as Clinical Pulse's status bar, rather than
// a second charting library surface). Each row pairs accuracy WITH volume so
// a one-activity domain is never mistaken for a strength. Ordered strongest
// first; domains with no scored activities yet sort to the bottom.
export function PatientDomainBreakdown({ domains }: { domains: DomainStat[] }) {
  const sorted = [...domains].sort((a, b) => {
    if (a.averageAccuracy === null && b.averageAccuracy === null) {
      return b.completedCount - a.completedCount;
    }
    if (a.averageAccuracy === null) return 1;
    if (b.averageAccuracy === null) return -1;
    return b.averageAccuracy - a.averageAccuracy || b.completedCount - a.completedCount;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Accuracy by domain</CardTitle>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No domain data yet — accuracy by therapy area appears once activities are completed.
          </p>
        ) : (
          <div className="flex flex-col gap-3.5">
            {sorted.map((d) => (
              <div key={d.domain} className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="truncate font-medium">{d.domain}</span>
                  <span className="shrink-0 text-muted-foreground">
                    {d.averageAccuracy !== null ? (
                      <>
                        <span className="font-semibold text-foreground tabular-nums">
                          {d.averageAccuracy}%
                        </span>{" "}
                        · {activityCount(d.completedCount)}
                      </>
                    ) : (
                      `No scored activities · ${activityCount(d.completedCount)}`
                    )}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${d.averageAccuracy ?? 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
