import { formatDate } from "@/lib/utils";
import type { Database } from "@/lib/types/database";
import { ReportSection } from "./report-section";

type Insight = Database["public"]["Tables"]["ai_insights"]["Row"];

function asStringList(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

// Renders only the latest EXISTING insight — never generates one. Same
// `ai_insights` row PatientInsightsPanel already fetches and shows live,
// but rendered here with fixed grayscale colors and no colored
// strength/concern/recommendation icons (PatientInsightsPanel's icon tints
// are theme tokens, which would be wrong on a printed white page if the
// clinician has dark mode on) and with no Generate/Refresh action, since
// the report must never trigger generation. Section is omitted entirely —
// not shown empty — when no insight exists yet.
export function ReportAiInsights({ insight }: { insight: Insight | null }) {
  if (!insight) return null;

  const strengths = asStringList(insight.strengths);
  const concerns = asStringList(insight.concerns);
  const recommendations = asStringList(insight.recommendations);

  return (
    <ReportSection title="AI-generated insights">
      <div className="flex flex-col gap-3 text-sm">
        <p className="text-black">{insight.summary}</p>
        {strengths.length > 0 && <InsightList label="Strengths" items={strengths} />}
        {concerns.length > 0 && <InsightList label="Concerns" items={concerns} />}
        {recommendations.length > 0 && <InsightList label="Recommendations" items={recommendations} />}
        <p className="text-xs text-gray-500">
          Generated {formatDate(insight.generated_at)} from {insight.attempts_considered} attempt
          {insight.attempts_considered === 1 ? "" : "s"} · Not a clinical diagnosis.
        </p>
      </div>
    </ReportSection>
  );
}

function InsightList({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <ul className="flex flex-col gap-0.5">
        {items.map((item, i) => (
          <li key={i} className="flex gap-1.5 text-black">
            <span className="mt-1.5 size-1 shrink-0 rounded-full bg-gray-400" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
