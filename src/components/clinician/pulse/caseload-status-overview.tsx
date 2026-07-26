import Link from "next/link";
import { AlertTriangle, Users, Moon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { StatusDistribution, StatusResult } from "@/lib/analytics/types";
import { STATUS_META, STATUS_ORDER } from "./status-meta";
import type { PatientRefMap } from "./types";

const MAX_ATTENTION_ROWS = 4;

type PatientStatusEntry = StatusResult & { patientId: string };

// "Which patients need my attention today?" — the caseload's health at a
// glance (a proportional distribution bar + legend counts), followed by the
// actionable part: the specific patients flagged for attention, each with
// the plain-language reason the analytics layer already computed, linking
// straight to that patient.
export function CaseloadStatusOverview({
  patientStatuses,
  distribution,
  patients,
}: {
  patientStatuses: PatientStatusEntry[];
  distribution: StatusDistribution;
  patients: PatientRefMap;
}) {
  const total = patientStatuses.length;
  const segments = STATUS_ORDER.filter((s) => distribution[s] > 0);
  const attention = patientStatuses.filter((p) => p.status === "needs_attention");
  // "Engaged" = anyone with activity in the last 7 days. When this is zero,
  // the whole caseload is inactive and a proportional bar would just be a
  // solid grey strip — meaningless — so we swap in a dedicated state.
  const engaged = distribution.improving + distribution.stable + distribution.needs_attention;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Caseload health</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {total === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Users className="size-5" />
            </span>
            <p className="text-sm font-medium">No patients yet</p>
            <p className="max-w-xs text-xs text-muted-foreground">
              Invite a patient to start tracking how your caseload is doing.
            </p>
            <Link href="/clinician/caseload" className="text-xs font-medium text-primary hover:underline">
              Go to caseload →
            </Link>
          </div>
        ) : engaged === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Moon className="size-5" />
            </span>
            <p className="text-sm font-medium">
              {total === 1 ? "Your patient has" : `All ${total} patients have`} been quiet this week
            </p>
            <p className="max-w-xs text-xs text-muted-foreground">
              No activities completed in the last 7 days. Assign fresh work or send a reminder to
              re-engage them.
            </p>
            <Link href="/clinician/assignments" className="text-xs font-medium text-primary hover:underline">
              Review assignments →
            </Link>
          </div>
        ) : (
          <>
            {/* Proportional distribution bar */}
            <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted" aria-hidden>
              {segments.map((s) => (
                <div
                  key={s}
                  className={STATUS_META[s].bar}
                  style={{ width: `${(distribution[s] / total) * 100}%` }}
                />
              ))}
            </div>

            {/* Legend with counts — each row is a real filter into the
                Caseload page (reusing the same status-filter mechanism the
                "needs attention" overflow link below uses), so the whole
                legend doubles as navigation, not just a readout. */}
            <ul className="grid grid-cols-2 gap-2">
              {STATUS_ORDER.map((s) => {
                const count = distribution[s];
                const row = (
                  <>
                    <span className={`size-2.5 shrink-0 rounded-full ${STATUS_META[s].dot}`} aria-hidden />
                    <span className="text-muted-foreground">{STATUS_META[s].label}</span>
                    <span className="ml-auto font-semibold tabular-nums">{count}</span>
                  </>
                );
                return (
                  <li key={s}>
                    {count > 0 ? (
                      <Link
                        href={`/clinician/caseload?status=${s}`}
                        className="-mx-1 flex items-center gap-2 rounded-md px-1 py-0.5 text-sm transition-colors hover:bg-muted/60"
                      >
                        {row}
                      </Link>
                    ) : (
                      <div className="flex items-center gap-2 px-1 py-0.5 text-sm">{row}</div>
                    )}
                  </li>
                );
              })}
            </ul>

            {/* Actionable list: who specifically needs attention, and why */}
            {attention.length > 0 && (
              <div className="flex flex-col gap-1.5 border-t border-border pt-3">
                <p className="flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="size-3.5" /> Needs attention
                </p>
                {attention.slice(0, MAX_ATTENTION_ROWS).map((p) => {
                  const ref = patients[p.patientId];
                  const name = ref?.name ?? "Patient";
                  const row = (
                    <>
                      <span className="truncate text-sm font-medium">{name}</span>
                      <span className="truncate text-xs text-muted-foreground">{p.reason}</span>
                    </>
                  );
                  return ref ? (
                    <Link
                      key={p.patientId}
                      href={`/clinician/caseload/${ref.caseloadLinkId}`}
                      className="-mx-2 flex flex-col rounded-md px-2 py-1.5 transition-colors hover:bg-muted/60"
                    >
                      {row}
                    </Link>
                  ) : (
                    <div key={p.patientId} className="-mx-2 flex flex-col px-2 py-1.5">
                      {row}
                    </div>
                  );
                })}
                {attention.length > MAX_ATTENTION_ROWS && (
                  <Link
                    href="/clinician/caseload?status=needs_attention"
                    className="px-0.5 text-xs font-medium text-primary hover:underline"
                  >
                    +{attention.length - MAX_ATTENTION_ROWS} more →
                  </Link>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
