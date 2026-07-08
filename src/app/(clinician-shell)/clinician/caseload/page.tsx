import { requireProfile } from "@/lib/auth/session";
import { getCaseload } from "@/lib/data/clinician";
import { Card, CardContent } from "@/components/ui/card";
import { InvitePatientDialog } from "@/components/clinician/invite-patient-dialog";
import { CaseloadList } from "@/components/clinician/caseload-list";
import { Users } from "lucide-react";

export default async function CaseloadPage() {
  const { supabase, user } = await requireProfile("clinician");
  const caseload = await getCaseload(supabase, user.id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Caseload</h2>
          <p className="text-sm text-muted-foreground">
            {caseload.length} patient{caseload.length === 1 ? "" : "s"} on your roster.
          </p>
        </div>
        <InvitePatientDialog />
      </div>

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
      ) : (
        <CaseloadList caseload={caseload} />
      )}
    </div>
  );
}
