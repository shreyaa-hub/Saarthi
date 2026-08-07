import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth/session";
import { CanvasEditor } from "@/components/canvas/canvas-editor";

// The same editor the clinician Studio uses, narrowed to the worksheet
// surface. Ownership is enforced by the owner_id filter here and by the
// templates_owner_all RLS policy underneath, so a parent can only ever open a
// worksheet they authored.
export default async function ParentWorksheetEditorPage({
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
    console.error("ParentWorksheetEditorPage: failed to load worksheet", error);
    throw new Error(`Could not load worksheet: ${error.message}`);
  }
  if (!template) notFound();

  return <CanvasEditor template={template} surface="worksheet" backHref="/parent/creator-hub" />;
}
