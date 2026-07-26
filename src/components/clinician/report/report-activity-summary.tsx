import { formatDate } from "@/lib/utils";
import { ReportSection } from "./report-section";

const MAX_ROWS = 20;

type AttemptRow = {
  id: string;
  assignment_id: string;
  score: number | null;
  correct_count: number;
  total_count: number;
  completed_at: string;
};

// A clinical summary, not an audit log — capped at the most recent 20
// completed activities (agreed scope), with an explicit note when more
// exist so the clinician knows this isn't the complete history.
export function ReportActivitySummary({
  attempts,
  titleByAssignment,
}: {
  attempts: AttemptRow[];
  titleByAssignment: Record<string, string>;
}) {
  const sorted = [...attempts].sort(
    (a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime(),
  );
  const shown = sorted.slice(0, MAX_ROWS);

  return (
    <ReportSection title="Activity summary">
      {shown.length === 0 ? (
        <p className="text-sm text-gray-500">No completed activities yet.</p>
      ) : (
        <>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-300 text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="py-1.5 pr-3 font-medium">Date</th>
                <th className="py-1.5 pr-3 font-medium">Activity</th>
                <th className="py-1.5 text-right font-medium">Score</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((a) => (
                <tr key={a.id} className="border-b border-gray-100">
                  <td className="py-1.5 pr-3 text-gray-600">{formatDate(a.completed_at)}</td>
                  <td className="py-1.5 pr-3 text-black">{titleByAssignment[a.assignment_id] ?? "Activity"}</td>
                  <td className="py-1.5 text-right tabular-nums text-black">
                    {a.correct_count}/{a.total_count} ({a.score ?? 0}%)
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {sorted.length > MAX_ROWS && (
            <p className="mt-2 text-xs text-gray-500">
              Showing the {MAX_ROWS} most recent completed activities.
            </p>
          )}
        </>
      )}
    </ReportSection>
  );
}
