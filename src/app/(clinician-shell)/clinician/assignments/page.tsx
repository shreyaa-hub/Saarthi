import Link from "next/link";
import { requireProfile } from "@/lib/auth/session";
import { getAssignments, getCaseload } from "@/lib/data/clinician";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { Send } from "lucide-react";

const statusVariant: Record<string, "success" | "secondary" | "outline"> = {
  completed: "success",
  in_progress: "secondary",
  assigned: "outline",
};

export default async function AssignmentsPage() {
  const { supabase, user } = await requireProfile("clinician");
  const [assignments, caseload] = await Promise.all([
    getAssignments(supabase, user.id),
    getCaseload(supabase, user.id),
  ]);
  const patientToLink = new Map(caseload.map((c) => [c.patient_id, c.id]));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold">Assignments</h2>
        <p className="text-sm text-muted-foreground">Every activity assigned across your caseload.</p>
      </div>

      {assignments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-secondary text-primary">
              <Send className="size-6" />
            </span>
            <p className="font-medium">No assignments yet</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Open a patient&apos;s profile to assign a published template.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {assignments.map((a) => (
            <Link key={a.id} href={`/clinician/caseload/${patientToLink.get(a.patient_id) ?? ""}`}>
              <Card className="transition-shadow hover:shadow-md">
                <CardContent className="flex items-center justify-between gap-3 py-4">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{a.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {a.profiles?.full_name ?? "Patient"} · Assigned {formatDate(a.created_at)}
                      {a.due_date ? ` · Due ${formatDate(a.due_date)}` : ""}
                    </p>
                  </div>
                  <Badge variant={statusVariant[a.status] ?? "outline"}>{a.status.replace("_", " ")}</Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
