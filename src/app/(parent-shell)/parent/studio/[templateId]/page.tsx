import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth/session";
import { CanvasEditor } from "@/components/canvas/canvas-editor";

// The same editor the clinician Studio uses, and the same rule for choosing a
// surface from the medium — print templates are worksheets and get the page
// bar plus worksheet-only tools, everything else gets the activity palette.
// Ownership is enforced by the owner_id filter here and by templates_owner_all
// underneath, so a parent can only ever open something they authored.
export default async function ParentStudioPage({
  params,
}: {
  params: Promise<{ templateId: string }>;
}) {
  const { templateId } = await params;
  const { supabase, user } = await requireProfile("parent");

  const { data: template, error } = await supabase
    .from("templates")
    .select("id, title, domain, medium, status, canvas, updated_at")
    .eq("id", templateId)
    .eq("owner_id", user.id)
    .is("deleted_at", null)
    .single();

  // PGRST116 = "no rows", a genuine 404. Anything else is a real failure and
  // should surface rather than masquerade as "doesn't exist".
  if (error && error.code !== "PGRST116") {
    console.error("ParentStudioPage: failed to load template", error);
    throw new Error(`Could not load it: ${error.message}`);
  }
  if (!template) notFound();

  return (
    <CanvasEditor
      template={template}
      surface={template.medium === "print" ? "worksheet" : "activity"}
      backHref="/parent/creator-hub"
    />
  );
}
