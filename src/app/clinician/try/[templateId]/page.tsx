import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth/session";
import { getPublicTemplateDetail } from "@/lib/data/library";
import { getStarter, isStarterId } from "@/lib/canvas/starters";
import { ActivityPlayer } from "@/components/player/activity-player";
import type { TemplateCanvas } from "@/lib/types/canvas";

// A clinician working through an activity themselves, exactly as the patient
// will see it.
//
// Until now they could print a template or assign it, and nothing else — so
// the first person to actually play a new activity was the child it was built
// for. A mis-keyed answer, a question that reads badly aloud, an option grid
// that overflows on a phone: all of it surfaced in a session rather than
// before one.
//
// Runs the real ActivityPlayer in practice mode, so this is the patient's
// experience and not an approximation of it — same scoring, same feedback,
// same read-aloud. practice=true means nothing is recorded: there is no
// assignment behind this and a clinician's rehearsal must never land in a
// patient's history.
//
// Outside (clinician-shell) deliberately, like the report and the studio
// editor: the player is a full-screen experience, and the app's sidebar
// around it would misrepresent what the patient sees.
export default async function ClinicianTryPage({
  params,
}: {
  params: Promise<{ templateId: string }>;
}) {
  const { templateId } = await params;
  const { supabase, user } = await requireProfile("clinician");

  // Three sources, one screen: a built-in starter (held in code, not a row),
  // the clinician's own template at any status, and anything published to the
  // Global Library. Tried in that order.
  // Only the three fields the player needs, so a starter (a richer in-code
  // object) and a database row can be held in the same variable.
  type Playable = { id: string; title: string; canvas: TemplateCanvas };
  let template: Playable | null = isStarterId(templateId) ? (getStarter(templateId) ?? null) : null;

  if (!template) {
    const { data: own } = await supabase
      .from("templates")
      .select("id, title, canvas")
      .eq("id", templateId)
      .eq("owner_id", user.id)
      .is("deleted_at", null)
      .maybeSingle();
    template = own ?? null;
  }

  // Falls through to the library so a clinician can try something before
  // importing it, which is the whole point of a preview.
  if (!template) template = await getPublicTemplateDetail(supabase, templateId);

  if (!template) notFound();

  return (
    <ActivityPlayer
      assignmentId=""
      title={template.title}
      canvas={template.canvas}
      alreadyCompleted={false}
      practice
      practiceNote="You're trying this out. Nothing is recorded, and no patient sees it."
      backHref="/clinician/studio"
      backLabel="the Studio"
      printHref={`/print/template/${template.id}`}
    />
  );
}
