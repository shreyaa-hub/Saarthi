import { requireProfile } from "@/lib/auth/session";
import { getAssignments } from "@/lib/data/clinician";
import { SchedulerCalendar } from "@/components/clinician/scheduler-calendar";
import { Reveal } from "@/components/motion/reveal";

export default async function SchedulePage() {
  const { supabase } = await requireProfile("clinician");
  const assignments = await getAssignments(supabase);

  return (
    <div className="flex flex-col gap-6">
      <Reveal>
        <h2 className="font-display text-2xl font-semibold">Clinical Scheduler</h2>
        <p className="text-sm text-muted-foreground">
          Every assignment across your caseload, laid out by due date.
        </p>
      </Reveal>

      <Reveal delay={0.08}>
        <SchedulerCalendar assignments={assignments} />
      </Reveal>
    </div>
  );
}
