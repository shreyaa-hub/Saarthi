import { goalProgress, type PatientGoal } from "@/lib/goals";
import type { AnalyticsAttempt } from "@/lib/analytics/types";
import { formatDate } from "@/lib/utils";
import { ReportSection } from "./report-section";

// What the patient was working towards, and how far they got.
//
// The section this report was missing. Everything else here says how accurate
// the patient has been; none of it said what anyone was trying to achieve, so
// the document a parent or a school actually reads had the numbers and not
// the point of them.
//
// Measured with goalProgress, the same function the live screens use, so a
// goal that reads "met" on the caseload page cannot read otherwise on paper.
export function ReportGoals({
  goals,
  attempts,
}: {
  goals: PatientGoal[];
  attempts: AnalyticsAttempt[];
}) {
  // Archived goals are left out: they were explicitly set aside, and a
  // discharge summary listing work that was abandoned without saying why
  // raises a question the report cannot answer. Active and achieved are the
  // two a reader can act on.
  const shown = goals.filter((g) => g.status !== "archived");
  const active = shown.filter((g) => g.status === "active");
  const achieved = shown.filter((g) => g.status === "achieved");

  return (
    <ReportSection title="Therapy goals">
      {shown.length === 0 ? (
        <p className="text-sm text-gray-500">No goals recorded for this patient.</p>
      ) : (
        <>
          <p className="mb-3 text-sm text-gray-600">
            {achieved.length > 0 && `${achieved.length} achieved`}
            {achieved.length > 0 && active.length > 0 && " · "}
            {active.length > 0 && `${active.length} in progress`}
          </p>
          <div className="flex flex-col gap-3">
            {[...active, ...achieved].map((goal) => (
              <GoalLine key={goal.id} goal={goal} attempts={attempts} />
            ))}
          </div>
        </>
      )}
    </ReportSection>
  );
}

function GoalLine({ goal, attempts }: { goal: PatientGoal; attempts: AnalyticsAttempt[] }) {
  const progress = goalProgress(goal, attempts);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="font-medium text-black">{goal.title}</span>
        <span className="shrink-0 text-gray-600">
          {goal.status === "achieved"
            ? `Achieved ${goal.achievedAt ? formatDate(goal.achievedAt) : ""}`.trim()
            : progress.accuracy === null
              ? "Not yet measurable"
              : `${progress.accuracy}% of ${goal.targetAccuracy}% target`}
        </span>
      </div>

      <div className="flex items-baseline justify-between gap-2 text-xs text-gray-500">
        <span>
          Target {goal.targetAccuracy}% over {goal.windowAttempts} activit
          {goal.windowAttempts === 1 ? "y" : "ies"}
          {goal.domain ? ` · ${goal.domain}` : " · any activity"}
        </span>
        <span className="shrink-0">Set {formatDate(goal.createdAt)}</span>
      </div>

      {/* The bar carries the target as a printed tick, because a percentage
          on its own does not show how close "not yet" actually is. Grayscale
          throughout: this page is printed, often in black and white, so
          nothing here may depend on colour to be read. */}
      <div className="relative h-1.5 w-full overflow-hidden rounded-sm bg-gray-200">
        <div
          className="h-full bg-gray-700"
          style={{ width: `${Math.min(100, progress.accuracy ?? 0)}%` }}
        />
        <div
          className="absolute inset-y-0 w-px bg-black"
          style={{ left: `${goal.targetAccuracy}%` }}
        />
      </div>

      <p className="text-xs text-gray-500">
        {progress.accuracy === null
          ? `No activities counted yet — ${progress.required} needed before this can be measured.`
          : `Measured over ${progress.counted} of ${progress.required} activities` +
            (progress.remaining > 0 ? ` · ${progress.remaining} more to go` : "") +
            (progress.met && goal.status === "active" ? " · target reached" : "")}
      </p>
    </div>
  );
}
