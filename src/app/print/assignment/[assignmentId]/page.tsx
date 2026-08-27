import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOptionalViewer } from "@/lib/auth/session";
import { homeForRole } from "@/lib/auth/roles";
import type { TemplateCanvas } from "@/lib/types/canvas";
import { PrintableCanvas } from "@/components/print/printable-canvas";
import { PrintBar } from "@/components/print/print-bar";

// Printable view of an ASSIGNED activity, which is what a patient (or their
// parent) actually holds — the assignment's own frozen canvas_snapshot, not
// the template it came from. A patient usually cannot read that template at
// all, and even when they can it may have been edited since; the snapshot is
// the thing they were given.
//
// Same single-query-plus-RLS approach as the template route: the assignments
// policies already grant the patient, their guardian and the assigning
// clinician, and nobody else.
export default async function PrintAssignmentPage({
  params,
}: {
  params: Promise<{ assignmentId: string }>;
}) {
  const { assignmentId } = await params;
  const supabase = await createClient();

  const { data: assignment } = await supabase
    .from("assignments")
    .select("id, title, instructions, canvas_snapshot")
    .eq("id", assignmentId)
    .single();

  if (!assignment) notFound();

  const { role } = await getOptionalViewer();
  const backHref = role ? homeForRole(role) : "/sign-in";

  return (
    <div className="min-h-screen bg-white">
      <PrintBar
        title={assignment.title}
        subtitle={assignment.instructions ?? undefined}
        backHref={backHref}
      />
      <div className="flex flex-col items-center px-4 py-8 print:p-0">
        <PrintableCanvas canvas={assignment.canvas_snapshot as TemplateCanvas} />
      </div>
    </div>
  );
}
