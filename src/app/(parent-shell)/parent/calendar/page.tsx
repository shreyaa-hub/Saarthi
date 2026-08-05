import { getParentContext } from "@/lib/parent/context";
import { getChildAssignments } from "@/lib/data/parent";
import { SchedulerCalendar } from "@/components/clinician/scheduler-calendar";
import { NoChildState } from "@/components/parent/no-child-state";
import { Reveal } from "@/components/motion/reveal";

export default async function ParentCalendarPage() {
  const { supabase, child } = await getParentContext();

  if (!child) {
    return (
      <NoChildState
        title="Calendar"
        description="Connect to your child to see their activity due dates laid out by month."
      />
    );
  }

  const assignments = await getChildAssignments(supabase, child.childId);
  const firstName = child.name.split(" ")[0];

  return (
    <div className="flex flex-col gap-6">
      <Reveal>
        <h2 className="font-display text-2xl font-semibold">Calendar</h2>
        <p className="text-sm text-muted-foreground">
          {firstName}&apos;s activities, laid out by due date.
        </p>
      </Reveal>

      <Reveal delay={0.08}>
        {/* Same calendar the clinician's Scheduler uses — one child in view,
            so assignee names are suppressed and "view all" stays inside the
            parent area. */}
        <SchedulerCalendar
          assignments={assignments}
          showAssignee={false}
          viewAllHref="/parent/missions"
          viewAllLabel="View all missions"
        />
      </Reveal>
    </div>
  );
}
