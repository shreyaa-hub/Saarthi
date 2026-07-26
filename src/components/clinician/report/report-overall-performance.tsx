import type { PatientActivitySummary, StatusResult } from "@/lib/analytics/types";
import { STATUS_META } from "@/components/clinician/pulse/status-meta";
import { ReportSection } from "./report-section";

// Renders buildPatientAnalytics's existing summary/status output — no new
// calculation. Only STATUS_META's plain-text `label` is used, never its
// color classes (`dot`/`text`/`bar`), so status here is communicated by
// wording alone, matching the report's grayscale, ink-friendly treatment.
export function ReportOverallPerformance({
  summary,
  status,
}: {
  summary: PatientActivitySummary;
  status: StatusResult;
}) {
  const tiles = [
    {
      label: "All-time avg accuracy",
      value: summary.averageAccuracy !== null ? `${summary.averageAccuracy}%` : "N/A",
    },
    {
      label: "This week",
      value: summary.thisWeekAccuracy !== null ? `${summary.thisWeekAccuracy}%` : "No activity",
    },
    { label: "Total activities completed", value: String(summary.totalCompleted) },
    { label: "Active days", value: String(summary.activeDays) },
  ];

  return (
    <ReportSection title="Overall performance">
      <p className="text-sm">
        <span className="font-semibold text-black">{STATUS_META[status.status].label}.</span>{" "}
        <span className="text-gray-600">{status.reason}</span>
      </p>
      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label}>
            <dd className="text-lg font-semibold text-black">{t.value}</dd>
            <dt className="text-xs text-gray-500">{t.label}</dt>
          </div>
        ))}
      </dl>
    </ReportSection>
  );
}
