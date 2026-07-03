import Link from "next/link";
import { requireProfile } from "@/lib/auth/session";
import { getCaseload } from "@/lib/data/clinician";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials, formatDate, cn } from "@/lib/utils";
import { InvitePatientDialog } from "@/components/clinician/invite-patient-dialog";
import { PatientRowActions } from "@/components/clinician/patient-row-actions";
import { Users, ChevronRight } from "lucide-react";

const statusStyles: Record<string, "success" | "secondary" | "outline"> = {
  active: "success",
  invited: "secondary",
  archived: "outline",
};

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
        <div className="grid gap-3">
          {caseload.map((row) => {
            const name = row.profiles?.full_name ?? row.display_name;
            const linked = Boolean(row.patient_id);
            return (
              <Card
                key={row.id}
                className={cn(
                  "relative transition-all",
                  linked && "hover:border-primary/40 hover:shadow-md",
                )}
              >
                <CardContent className="flex items-center gap-4 py-4">
                  <Avatar className="size-11 shrink-0">
                    <AvatarFallback>{initials(name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    {linked ? (
                      <Link
                        href={`/clinician/caseload/${row.id}`}
                        className="truncate font-medium after:absolute after:inset-0 after:content-['']"
                      >
                        {name}
                      </Link>
                    ) : (
                      <p className="truncate font-medium">{name}</p>
                    )}
                    <p className="truncate text-xs text-muted-foreground">
                      {row.profiles?.email ?? `Invited ${formatDate(row.created_at)}`}
                    </p>
                  </div>
                  <Badge variant={statusStyles[row.status]}>{row.status}</Badge>
                  {linked && (
                    <ChevronRight className="hidden size-4 shrink-0 text-muted-foreground sm:block" />
                  )}
                  <div className="relative z-10">
                    <PatientRowActions id={row.id} status={row.status} inviteCode={row.invite_code} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
