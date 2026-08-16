import { ClipboardList, AlertTriangle, CheckCircle2, Home } from "lucide-react";
import { getParentContext } from "@/lib/parent/context";
import { getChildAssignments } from "@/lib/data/parent";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NoChildState } from "@/components/parent/no-child-state";
import { formatDate, cn } from "@/lib/utils";

const statusVariant: Record<string, "success" | "secondary" | "outline"> = {
  completed: "success",
  in_progress: "secondary",
  assigned: "outline",
};

function isOverdue(dueDate: string | null, status: string) {
  if (!dueDate || status === "completed") return false;
  return new Date(dueDate) < new Date(new Date().toDateString());
}

export default async function ParentMissionsPage() {
  const { supabase, child } = await getParentContext();

  if (!child) {
    return (
      <NoChildState
        title="Missions"
        description="Connect to your child to see the activities their clinician has assigned."
      />
    );
  }

  const assignments = await getChildAssignments(supabase, child.childId);
  const pending = assignments.filter((a) => a.status !== "completed");
  const completed = assignments.filter((a) => a.status === "completed");
  const firstName = child.name.split(" ")[0];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-display text-2xl font-semibold">Missions</h2>
        <p className="text-sm text-muted-foreground">
          Everything assigned to {firstName} — by their clinician, and anything you&apos;ve sent from
          the Creator Hub. {firstName} completes these in their own account.
        </p>
      </div>

      <div>
        <h3 className="mb-3 text-lg font-semibold">To do ({pending.length})</h3>
        {pending.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-secondary text-primary">
                <ClipboardList className="size-6" />
              </span>
              <p className="font-medium">All caught up</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Nothing outstanding for {firstName} right now.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pending.map((a) => {
              const late = isOverdue(a.due_date, a.status);
              return (
                <Card key={a.id}>
                  <CardContent className="flex flex-col gap-3 pt-6">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium">{a.title}</p>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {/* Sent from home rather than prescribed — the same
                            distinction the clinician's own views draw. */}
                        {a.clinician_id === null && (
                          <Badge variant="outline" className="gap-1">
                            <Home className="size-3" /> Home
                          </Badge>
                        )}
                        <Badge variant={statusVariant[a.status] ?? "outline"}>
                          {a.status.replace("_", " ")}
                        </Badge>
                      </div>
                    </div>
                    {a.instructions && <p className="text-sm text-muted-foreground">{a.instructions}</p>}
                    <p
                      className={cn(
                        "flex items-center gap-1.5 text-xs",
                        late ? "font-medium text-destructive" : "text-muted-foreground",
                      )}
                    >
                      {late && <AlertTriangle className="size-3.5" />}
                      {a.due_date ? `Due ${formatDate(a.due_date)}` : "No due date"}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {completed.length > 0 && (
        <div>
          <h3 className="mb-3 text-lg font-semibold">Completed ({completed.length})</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {completed.map((a) => (
              <Card key={a.id}>
                <CardContent className="flex items-center gap-3 pt-6">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
                    <CheckCircle2 className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{a.title}</p>
                    <p className="text-xs text-muted-foreground">Assigned {formatDate(a.created_at)}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
