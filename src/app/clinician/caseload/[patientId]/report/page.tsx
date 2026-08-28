import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth/session";
import { getPatientDetail, getPatientPerformanceData } from "@/lib/data/clinician";
import { getPatientGoals } from "@/lib/data/goals";
import { ReportPrintBar } from "@/components/clinician/report/report-print-bar";
import { ReportHeader } from "@/components/clinician/report/report-header";
import { ReportOverallPerformance } from "@/components/clinician/report/report-overall-performance";
import { ReportTrendChart } from "@/components/clinician/report/report-trend-chart";
import { ReportDomainPerformance } from "@/components/clinician/report/report-domain-performance";
import { ReportGoals } from "@/components/clinician/report/report-goals";
import { ReportActivitySummary } from "@/components/clinician/report/report-activity-summary";
import { ReportClinicianNotes } from "@/components/clinician/report/report-clinician-notes";
import { ReportAiInsights } from "@/components/clinician/report/report-ai-insights";

// Deliberately outside (clinician-shell) — no layout.tsx in this segment,
// mirroring the studio/[templateId] precedent — so this route renders with
// none of the app's nav/sidebar/header chrome. A printed clinical document
// should read as a document, not as another page of the product.
export default async function PatientReportPage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  const { patientId } = await params;
  const { supabase, user, profile } = await requireProfile("clinician");

  const detail = await getPatientDetail(supabase, user.id, patientId);
  if (!detail) notFound();

  const { link, assignments, latestInsight } = detail;
  const patientName = link.profiles?.full_name ?? link.display_name;
  const clinicianName = profile.full_name;
  const titleByAssignment = Object.fromEntries(assignments.map((a) => [a.id, a.title]));

  if (!link.patient_id) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        <p className="text-sm text-gray-500">
          {patientName} hasn&apos;t claimed their invite code yet, so there&apos;s no activity to report on.
        </p>
      </div>
    );
  }

  // Same composer the live patient page uses — same fetch, same analytics,
  // no report-specific calculations.
  const [{ attemptRows, analyticsAttempts, analytics, weeklyTrend }, goals] = await Promise.all([
    getPatientPerformanceData(supabase, user.id, link.patient_id),
    getPatientGoals(supabase, link.patient_id),
  ]);

  return (
    <div className="min-h-screen bg-white">
      <style>{`@page { margin: 0.75in; }`}</style>
      <ReportPrintBar backHref={`/clinician/caseload/${link.id}`} />
      <div className="mx-auto max-w-3xl px-8 py-10 print:max-w-none print:px-0 print:py-0">
        <ReportHeader
          patientName={patientName}
          clinicianName={clinicianName}
          firstActivityAt={analytics.summary.firstActivityAt}
          lastActivityAt={analytics.summary.lastActivityAt}
        />
        <ReportOverallPerformance summary={analytics.summary} status={analytics.status} />
        {/* Directly after the headline figures and before the breakdowns:
            what the numbers were for, read before they are picked apart. */}
        <ReportGoals goals={goals} attempts={analyticsAttempts} />
        <ReportTrendChart points={weeklyTrend} />
        <ReportDomainPerformance domains={analytics.domains} />
        <ReportActivitySummary attempts={attemptRows} titleByAssignment={titleByAssignment} />
        <ReportClinicianNotes attempts={attemptRows} titleByAssignment={titleByAssignment} />
        <ReportAiInsights insight={latestInsight} />
      </div>
    </div>
  );
}
