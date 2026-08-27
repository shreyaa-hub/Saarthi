import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth/session";
import { getAssignmentForPlay } from "@/lib/data/patient";
import { ActivityPlayer } from "@/components/player/activity-player";

export default async function ActivityPlayPage({
  params,
}: {
  params: Promise<{ assignmentId: string }>;
}) {
  const { assignmentId } = await params;
  const { supabase, user } = await requireProfile("patient");

  const assignment = await getAssignmentForPlay(supabase, user.id, assignmentId);
  if (!assignment) notFound();

  return (
    <ActivityPlayer
      assignmentId={assignment.id}
      title={assignment.title}
      canvas={assignment.canvas_snapshot}
      alreadyCompleted={assignment.status === "completed"}
      printHref={`/print/assignment/${assignment.id}`}
    />
  );
}
