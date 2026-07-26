import type { DomainStat } from "@/lib/analytics/types";
import { pluralize } from "@/lib/utils";
import { sortDomainsForDisplay } from "@/components/clinician/analytics/patient-domain-breakdown";
import { ReportSection } from "./report-section";

// Same data and same display ordering as PatientDomainBreakdown (via the
// shared sortDomainsForDisplay), rendered with fixed grayscale bars instead
// of that component's Card chrome and primary-colored fill — no new
// calculation, just print-appropriate presentation.
export function ReportDomainPerformance({ domains }: { domains: DomainStat[] }) {
  const sorted = sortDomainsForDisplay(domains);

  return (
    <ReportSection title="Domain performance">
      {sorted.length === 0 ? (
        <p className="text-sm text-gray-500">No domain data recorded yet.</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {sorted.map((d) => (
            <div key={d.domain} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="font-medium text-black">{d.domain}</span>
                <span className="shrink-0 text-gray-600">
                  {d.averageAccuracy !== null ? `${d.averageAccuracy}%` : "No scored activities"} ·{" "}
                  {pluralize(d.completedCount, "activity", "activities")}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-sm bg-gray-200">
                <div className="h-full bg-gray-700" style={{ width: `${d.averageAccuracy ?? 0}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </ReportSection>
  );
}
