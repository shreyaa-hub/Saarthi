import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GoalRow } from "@/components/goals/goal-progress-bar";
import type { PatientGoal } from "@/lib/goals";
import type { AnalyticsAttempt } from "@/lib/analytics/types";

// The goals as the patient and their guardian see them: the same rows and the
// same measurement as the clinician's card, with no controls. Read-only is
// enforced by RLS (patient_goals has only SELECT policies for these two), not
// by the absence of buttons here.
export function GoalsReadOnly({
  goals,
  attempts,
  title = "Goals",
  emptyText,
}: {
  goals: PatientGoal[];
  attempts: AnalyticsAttempt[];
  title?: string;
  emptyText: string;
}) {
  // Retired goals are kept out of this view rather than greyed: someone
  // checking their own progress wants what they are working on now, and the
  // full history is the clinician's record.
  const active = goals.filter((g) => g.status === "active");
  const achieved = goals.filter((g) => g.status === "achieved");

  if (active.length === 0 && achieved.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-6 text-center text-sm text-muted-foreground">{emptyText}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col divide-y divide-border">
          {[...active, ...achieved].map((goal) => (
            <GoalRow key={goal.id} goal={goal} attempts={attempts} />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
