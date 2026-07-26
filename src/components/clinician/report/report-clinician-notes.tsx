import { formatDate } from "@/lib/utils";
import { ReportSection } from "./report-section";

type AttemptRow = {
  id: string;
  assignment_id: string;
  clinician_note: string | null;
  completed_at: string;
};

// A pure filter on the same attempt rows the Activity Summary uses — no new
// fetch, no new calculation. The section is omitted entirely (not shown
// empty) when the patient has no notes, per the agreed report scope.
export function ReportClinicianNotes({
  attempts,
  titleByAssignment,
}: {
  attempts: AttemptRow[];
  titleByAssignment: Record<string, string>;
}) {
  const noted = attempts
    .filter((a): a is AttemptRow & { clinician_note: string } => Boolean(a.clinician_note))
    .sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime());

  if (noted.length === 0) return null;

  return (
    <ReportSection title="Clinician notes">
      <div className="flex flex-col gap-3">
        {noted.map((a) => (
          <div key={a.id} className="text-sm">
            <p className="text-xs text-gray-500">
              {formatDate(a.completed_at)} · {titleByAssignment[a.assignment_id] ?? "Activity"}
            </p>
            <p className="text-black">{a.clinician_note}</p>
          </div>
        ))}
      </div>
    </ReportSection>
  );
}
