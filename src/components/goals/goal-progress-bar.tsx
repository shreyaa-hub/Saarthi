import { Target, Check, Archive } from "lucide-react";
import { goalProgress, type PatientGoal } from "@/lib/goals";
import type { AnalyticsAttempt } from "@/lib/analytics/types";
import { cn } from "@/lib/utils";

// One goal, and how far along it is. Shared by the clinician's editable card
// and the read-only versions the patient and their guardian see, so all three
// read the same numbers rather than three near-identical renderings that
// could drift.
export function GoalRow({
  goal,
  attempts,
  children,
}: {
  goal: PatientGoal;
  attempts: AnalyticsAttempt[];
  /** The clinician's controls. Omitted for the read-only views. */
  children?: React.ReactNode;
}) {
  const progress = goalProgress(goal, attempts);
  const retired = goal.status !== "active";

  return (
    <li className={cn("flex flex-col gap-2 py-3", retired && "opacity-70")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-medium">
            {goal.status === "achieved" ? (
              <Check className="size-4 shrink-0 text-success" aria-hidden />
            ) : goal.status === "archived" ? (
              <Archive className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            ) : (
              <Target className="size-4 shrink-0 text-primary" aria-hidden />
            )}
            <span className="truncate">{goal.title}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            {goal.targetAccuracy}% over {goal.windowAttempts} activit
            {goal.windowAttempts === 1 ? "y" : "ies"}
            {goal.domain ? ` · ${goal.domain}` : " · any activity"}
          </p>
        </div>
        {children}
      </div>

      <GoalMeter goal={goal} progress={progress} />
    </li>
  );
}

function GoalMeter({
  goal,
  progress,
}: {
  goal: PatientGoal;
  progress: ReturnType<typeof goalProgress>;
}) {
  // Before a full window there is no honest answer, so the bar says what is
  // still needed instead of drawing a number that looks like a verdict.
  if (progress.accuracy === null) {
    return (
      <p className="text-xs text-muted-foreground">
        No activities counted yet — {progress.required} needed before this can be measured.
      </p>
    );
  }

  const pct = Math.min(100, progress.accuracy);
  return (
    <div className="flex flex-col gap-1">
      <div
        className="relative h-2 w-full overflow-hidden rounded-full bg-muted"
        role="meter"
        aria-valuenow={progress.accuracy}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${goal.title}: ${progress.accuracy}% against a target of ${goal.targetAccuracy}%`}
      >
        <div
          className={cn("h-full rounded-full", progress.met ? "bg-success" : "bg-primary")}
          style={{ width: `${pct}%` }}
        />
        {/* The target as a line on the bar — the whole point is reading
            progress against it, not as a number somewhere else. */}
        <div
          className="absolute inset-y-0 w-0.5 bg-foreground/60"
          style={{ left: `${goal.targetAccuracy}%` }}
          aria-hidden
        />
      </div>
      <p className="text-xs text-muted-foreground">
        <span className={cn("font-medium", progress.met ? "text-success" : "text-foreground")}>
          {progress.accuracy}%
        </span>{" "}
        over {progress.counted} of {progress.required} activities
        {progress.remaining > 0 && ` · ${progress.remaining} more to go`}
        {progress.met && goal.status === "active" && " · target reached"}
      </p>
    </div>
  );
}
