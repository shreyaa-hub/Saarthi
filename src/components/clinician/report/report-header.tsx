import { formatDate } from "@/lib/utils";

// Fixed black/gray/white colors throughout every report component in this
// folder, deliberately never the app's theme tokens (text-muted-foreground,
// bg-card, etc.) — those vary with the clinician's dark-mode preference
// (a global <html> class set by THEME_INIT_SCRIPT in the root layout, which
// this route still inherits), and a report meant to be printed or exported
// to PDF must render identically regardless of that preference.
export function ReportHeader({
  patientName,
  clinicianName,
  firstActivityAt,
  lastActivityAt,
}: {
  patientName: string;
  clinicianName: string;
  firstActivityAt: string | null;
  lastActivityAt: string | null;
}) {
  const period =
    firstActivityAt && lastActivityAt
      ? `${formatDate(firstActivityAt)} – ${formatDate(lastActivityAt)}`
      : "No activity recorded yet";

  return (
    <header className="break-inside-avoid border-b border-gray-300 pb-5">
      <p className="text-xs font-medium uppercase tracking-widest text-gray-400">Verbal Coach</p>
      <h1 className="mt-1 text-2xl font-semibold text-black">Patient Performance Report</h1>
      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-gray-500">Patient</dt>
          <dd className="font-medium text-black">{patientName}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Clinician</dt>
          <dd className="font-medium text-black">{clinicianName}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Period covered</dt>
          <dd className="font-medium text-black">{period}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Generated</dt>
          <dd className="font-medium text-black">{formatDate(new Date())}</dd>
        </div>
      </dl>
    </header>
  );
}
