import { Activity, Flame, TrendingUp } from "lucide-react";
import type { CaseloadPulse } from "@/lib/analytics/types";
import { CaseloadTrendCard } from "./caseload-trend-card";
import { CaseloadStatusOverview } from "./caseload-status-overview";
import { RankingCard, type RankingRow } from "./ranking-card";
import type { PatientRefMap } from "./types";

function countLabel(n: number, singular: string, pluralForm: string) {
  return `${n} ${n === 1 ? singular : pluralForm}`;
}

// Clinical Pulse — the caseload decision band that sits between the KPI
// stat cards and Recent Activity (approved placement). Every widget answers
// "what should I do next?": overall accuracy direction, who's improving,
// who's engaging, and who needs attention. Pure composition over the
// analytics model — no calculation lives here.
export function ClinicalPulse({
  pulse,
  patients,
}: {
  pulse: CaseloadPulse;
  patients: PatientRefMap;
}) {
  const improvedRows: RankingRow[] = pulse.mostImproved.map((entry) => {
    const ref = patients[entry.patientId];
    return {
      key: entry.patientId,
      name: ref?.name ?? "Patient",
      href: ref ? `/clinician/caseload/${ref.caseloadLinkId}` : null,
      metric: `+${entry.delta}%`,
      metricClass: "text-emerald-600 dark:text-emerald-400",
      detail: `${entry.lastWeekAccuracy}% → ${entry.thisWeekAccuracy}% · ${countLabel(entry.thisWeekAttempts, "activity", "activities")} this week`,
    };
  });

  const activeRows: RankingRow[] = pulse.mostActive.map((entry) => {
    const ref = patients[entry.patientId];
    return {
      key: entry.patientId,
      name: ref?.name ?? "Patient",
      href: ref ? `/clinician/caseload/${ref.caseloadLinkId}` : null,
      metric: `${entry.attemptCount}`,
      detail: "activities this week",
    };
  });

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Activity className="size-4" />
        </span>
        <div>
          <h3 className="font-display text-lg font-semibold leading-tight">Clinical Pulse</h3>
          <p className="text-xs text-muted-foreground">Your caseload at a glance</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CaseloadTrendCard pulse={pulse} />
        </div>
        <CaseloadStatusOverview
          patientStatuses={pulse.patientStatuses}
          distribution={pulse.statusDistribution}
          patients={patients}
        />
      </div>

      <div className="grid items-start gap-4 md:grid-cols-2">
        <RankingCard
          title="Most improved"
          icon={TrendingUp}
          rows={improvedRows}
          emptyText="No week-over-week gains yet — improvement shows here once patients complete activities across two weeks."
        />
        <RankingCard
          title="Most active"
          icon={Flame}
          rows={activeRows}
          emptyText="No activities completed this week yet — a quick reminder can help re-engage your patients."
        />
      </div>
    </section>
  );
}
