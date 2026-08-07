import Link from "next/link";
import { requireProfile } from "@/lib/auth/session";
import { getAssignments, getCaseload } from "@/lib/data/clinician";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, cn } from "@/lib/utils";
import { Send, ChevronRight, AlertTriangle, Home } from "lucide-react";

const statusVariant: Record<string, "success" | "secondary" | "outline"> = {
  completed: "success",
  in_progress: "secondary",
  assigned: "outline",
};

function isOverdue(dueDate: string | null, status: string) {
  if (!dueDate || status === "completed") return false;
  return new Date(dueDate) < new Date(new Date().toDateString());
}

export default async function AssignmentsPage() {
  const { supabase, user } = await requireProfile("clinician");
  const [assignments, caseload] = await Promise.all([
    getAssignments(supabase),
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
          {assignments.map((a) => {
            const linkTarget = patientToLink.get(a.patient_id);
            const overdue = isOverdue(a.due_date, a.status);
            const card = (
              <Card
                className={cn(
                  "transition-all",
                  linkTarget && "hover:border-primary/40 hover:shadow-md",
                  overdue && "border-destructive/40",
                )}
              >
                <CardContent className="flex items-center justify-between gap-3 py-4">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{a.title}</p>
                    <p
                      className={cn(
                        "truncate text-xs",
                        overdue ? "font-medium text-destructive" : "text-muted-foreground",
                      )}
                    >
                      {a.profiles?.full_name ?? "Patient"} · Assigned {formatDate(a.created_at)}
                      {a.due_date ? ` · Due ${formatDate(a.due_date)}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {overdue && (
                      <Badge variant="outline" className="gap-1 border-destructive/40 text-destructive">
                        <AlertTriangle className="size-3" /> Overdue
                      </Badge>
                    )}
                    {a.clinician_id === null && (
                      <Badge variant="outline" className="gap-1">
                        <Home className="size-3" /> Home practice
                      </Badge>
                    )}
                    <Badge variant={statusVariant[a.status] ?? "outline"}>
                      {a.status.replace("_", " ")}
                    </Badge>
                    {linkTarget && (
                      <ChevronRight className="hidden size-4 shrink-0 text-muted-foreground sm:block" />
                    )}
                  </div>
                </CardContent>
              </Card>
            );
            return linkTarget ? (
              <Link key={a.id} href={`/clinician/caseload/${linkTarget}`}>
                {card}
              </Link>
            ) : (
              <div key={a.id}>{card}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}
