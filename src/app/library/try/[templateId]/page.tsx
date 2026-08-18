import { notFound, redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth/session";
import { getPublicTemplateDetail } from "@/lib/data/library";
import { ActivityPlayer } from "@/components/player/activity-player";

// Practice mode: a patient working through something they picked out of the
// library themselves, rather than something their clinician prescribed.
//
// Signed-in patients only. A clinician or parent reaching this URL is sent to
// the library, where importing is the thing that makes sense for them; a
// logged-out visitor is sent to sign-in, having already seen the preview.
export default async function LibraryTryPage({
  params,
}: {
  params: Promise<{ templateId: string }>;
}) {
  const { templateId } = await params;
  const { supabase, profile } = await requireProfile();

  if (profile.role !== "patient") redirect("/library/templates");

  const template = await getPublicTemplateDetail(supabase, templateId);
  if (!template) notFound();

  return (
    <ActivityPlayer
      assignmentId=""
      title={template.title}
      canvas={template.canvas}
      alreadyCompleted={false}
      practice
      backHref="/library/templates"
      backLabel="the library"
    />
  );
}
