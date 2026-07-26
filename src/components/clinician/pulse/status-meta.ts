import type { PatientStatus } from "@/lib/analytics/types";

// The one place status -> presentation (label + colors) is defined, so the
// status overview here and any future consumer (e.g. the patient page badge)
// stay visually in sync. Colors are muted and workflow-appropriate: amber —
// not alarm-red — marks "needs attention" so it reads as a prompt, not an
// error, consistent with the app's calm palette.
export const STATUS_META: Record<
  PatientStatus,
  { label: string; dot: string; text: string; bar: string }
> = {
  improving: {
    label: "Improving",
    dot: "bg-emerald-500",
    text: "text-emerald-700 dark:text-emerald-400",
    bar: "bg-emerald-500",
  },
  stable: {
    label: "Stable",
    dot: "bg-slate-400",
    text: "text-slate-600 dark:text-slate-300",
    bar: "bg-slate-400",
  },
  needs_attention: {
    label: "Needs attention",
    dot: "bg-amber-500",
    text: "text-amber-700 dark:text-amber-400",
    bar: "bg-amber-500",
  },
  inactive: {
    label: "Inactive",
    dot: "bg-zinc-300 dark:bg-zinc-600",
    text: "text-muted-foreground",
    bar: "bg-zinc-300 dark:bg-zinc-600",
  },
};

// Positive-to-dormant reading order, used for both the distribution bar and
// the legend so they line up.
export const STATUS_ORDER: PatientStatus[] = ["improving", "stable", "needs_attention", "inactive"];

// Single source of truth for the Caseload page's status-filter URL contract.
// Every link that filters into a clinical status (Clinical Pulse's legend,
// its "needs attention" overflow) goes through this, and
// clinician/caseload/page.tsx's `isPatientStatus` parser is the other half
// of the same contract — if the query-param name or shape ever changes,
// there's one place to update on the producing side.
export function caseloadFilterHref(status: PatientStatus): string {
  return `/clinician/caseload?status=${status}`;
}
