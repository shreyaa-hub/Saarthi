import Link from "next/link";
import { requireProfile } from "@/lib/auth/session";
import { getCaseload, getCaseloadAttempts, getActivePatientsForAssignment } from "@/lib/data/clinician";
import { buildCaseloadPulse } from "@/lib/analytics/models";
import { Card, CardContent } from "@/components/ui/card";
import { InvitePatientDialog } from "@/components/clinician/invite-patient-dialog";
import { CaseloadList } from "@/components/clinician/caseload-list";
import { STATUS_META, STATUS_ORDER } from "@/components/clinician/pulse/status-meta";
import type { PatientStatus } from "@/lib/analytics/types";
import { Users, X } from "lucide-react";

function isPatientStatus(value: string | undefined): value is PatientStatus {
  return STATUS_ORDER.includes(value as PatientStatus);
}

export default async function CaseloadPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { supabase, user } = await requireProfile("clinician");
  const { status } = await searchParams;
  const activeStatus = isPatientStatus(status) ? status : null;

  const caseload = await getCaseload(supabase, user.id);

  // Clinical status (Improving/Stable/Needs attention/Inactive) is a derived
  // analytics classification, not a stored column — it only exists once
  // buildCaseloadPulse runs. Only pay for that extra fetch+compute when a
  // status filter is actually requested (e.g. via Clinical Pulse's "Needs
  // attention" link); a normal unfiltered visit to this page stays as cheap
  // as it always was.
  let visibleCaseload = caseload;
  if (activeStatus) {
    const [attempts, activePatients] = await Promise.all([
      getCaseloadAttempts(supabase, user.id),
      getActivePatientsForAssignment(supabase, user.id),
    ]);
    const patientIds = activePatients.map((p) => p.patient_id).filter((id): id is string => id !== null);
    const pulse = buildCaseloadPulse(attempts, patientIds);
    const matchingPatientIds = new Set(
      pulse.patientStatuses.filter((p) => p.status === activeStatus).map((p) => p.patientId),
    );
    visibleCaseload = caseload.filter((row) => row.patient_id && matchingPatientIds.has(row.patient_id));
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Caseload</h2>
          <p className="text-sm text-muted-foreground">
            {activeStatus
              ? `${visibleCaseload.length} patient${visibleCaseload.length === 1 ? "" : "s"} · ${STATUS_META[activeStatus].label}`
              : `${caseload.length} patient${caseload.length === 1 ? "" : "s"} on your roster.`}
          </p>
        </div>
        <InvitePatientDialog />
      </div>

      {activeStatus && (
        <div className="flex w-fit items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
          <span className={`size-2 shrink-0 rounded-full ${STATUS_META[activeStatus].dot}`} aria-hidden />
          Filtered to <span className="font-medium">{STATUS_META[activeStatus].label}</span>
          <Link
            href="/clinician/caseload"
            className="ml-1 flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" /> Clear
          </Link>
        </div>
      )}

      {caseload.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-secondary text-primary">
              <Users className="size-6" />
            </span>
            <p className="font-medium">No patients yet</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Invite your first patient to start assigning activities and tracking progress.
            </p>
            <InvitePatientDialog />
          </CardContent>
        </Card>
      ) : activeStatus && visibleCaseload.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-16 text-center">
            <p className="text-sm text-muted-foreground">
              No patients currently match &ldquo;{STATUS_META[activeStatus].label}&rdquo;.
            </p>
            <Link href="/clinician/caseload" className="text-xs font-medium text-primary hover:underline">
              Clear filter and view full caseload
            </Link>
          </CardContent>
        </Card>
      ) : (
        <CaseloadList
          caseload={visibleCaseload}
          placeholder={
            activeStatus ? `Search within these ${visibleCaseload.length} patients…` : undefined
          }
        />
      )}
    </div>
  );
}
