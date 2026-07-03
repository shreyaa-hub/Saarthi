import { requireProfile } from "@/lib/auth/session";
import { getMyAttempts } from "@/lib/data/patient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressChart } from "@/components/charts/progress-chart";
import { formatDate } from "@/lib/utils";

export default async function PatientProgressPage() {
  const { supabase, user } = await requireProfile("patient");
  const attempts = await getMyAttempts(supabase, user.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold">Your progress</h2>
        <p className="text-sm text-muted-foreground">Accuracy across every completed activity.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Accuracy over time</CardTitle>
        </CardHeader>
        <CardContent>
          <ProgressChart attempts={attempts} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
        </CardHeader>
        <CardContent>
          {attempts.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Complete your first activity to see it here.
            </p>
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {attempts.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-sm font-medium">
                      {(a as unknown as { assignments?: { title?: string } }).assignments?.title ?? "Activity"}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatDate(a.completed_at)}</p>
                  </div>
                  <p className="text-sm font-semibold">
                    {a.correct_count}/{a.total_count} ({a.score ?? 0}%)
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
