import Link from "next/link";
import { requireProfile } from "@/lib/auth/session";
import { getMyAssignments, getMyClinician } from "@/lib/data/patient";
import { ClaimInviteCard } from "@/components/patient/claim-invite-card";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { ClipboardList, Play, CheckCircle2 } from "lucide-react";

const statusVariant: Record<string, "success" | "secondary" | "outline"> = {
  completed: "success",
  in_progress: "secondary",
  assigned: "outline",
};

export default async function PatientDashboardPage() {
  const { supabase, profile, user } = await requireProfile("patient");
  const [assignments, clinician] = await Promise.all([
    getMyAssignments(supabase, user.id),
    getMyClinician(supabase, user.id),
  ]);

  const pending = assignments.filter((a) => a.status !== "completed");
  const completed = assignments.filter((a) => a.status === "completed");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-display text-2xl font-semibold">Hi {profile.full_name.split(" ")[0]}, ready to practice?</h2>
        {clinician?.profiles ? (
          <p className="text-sm text-muted-foreground">
            Working with {clinician.profiles.full_name}
            {clinician.profiles.headline ? ` · ${clinician.profiles.headline}` : ""}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">Not yet connected to a clinician.</p>
        )}
      </div>

      {!clinician && <ClaimInviteCard />}

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
                Nothing assigned right now — check back after your next session.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pending.map((a) => (
              <Card key={a.id}>
                <CardContent className="flex flex-col gap-3 pt-6">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium">{a.title}</p>
                    <Badge variant={statusVariant[a.status] ?? "outline"}>{a.status.replace("_", " ")}</Badge>
                  </div>
                  {a.instructions && <p className="text-sm text-muted-foreground">{a.instructions}</p>}
                  <p className="text-xs text-muted-foreground">
                    {a.due_date ? `Due ${formatDate(a.due_date)}` : "No due date"}
                  </p>
                  <Button asChild>
                    <Link href={`/patient/activity/${a.id}`}>
                      <Play className="size-4" /> Start
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {completed.length > 0 && (
        <div>
          <h3 className="mb-3 text-lg font-semibold">Completed ({completed.length})</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {completed.slice(0, 6).map((a) => (
              <Card key={a.id}>
                <CardContent className="flex items-center gap-3 pt-6">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
                    <CheckCircle2 className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{a.title}</p>
                    <p className="text-xs text-muted-foreground">Completed {formatDate(a.created_at)}</p>
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
