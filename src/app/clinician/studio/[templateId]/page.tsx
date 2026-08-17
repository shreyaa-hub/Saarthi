import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth/session";
import { CanvasEditor } from "@/components/canvas/canvas-editor";

export default async function TemplateEditorPage({
  params,
}: {
  params: Promise<{ templateId: string }>;
}) {
  const { templateId } = await params;
  const { supabase, user } = await requireProfile("clinician");

  const { data: template, error } = await supabase
    .from("templates")
    .select("id, title, domain, medium, status, canvas, updated_at")
    .eq("id", templateId)
    .eq("owner_id", user.id)
    .is("deleted_at", null)
    .single();

  // PGRST116 = "no rows" — that's a genuine 404. Any other error (e.g. a
  // column the database doesn't have yet because a migration wasn't run)
  // is a real failure and should surface as an error page, not a
  // misleading "this template doesn't exist."
  if (error && error.code !== "PGRST116") {
    console.error("TemplateEditorPage: failed to load template", error);
    throw new Error(`Could not load template: ${error.message}`);
  }
  if (!template) notFound();

  // Print templates ARE worksheets: worksheet-only tools, plus the page bar.
  // Interactive and hybrid keep the full activity palette.
  return (
    <CanvasEditor
      template={template}
      surface={template.medium === "print" ? "worksheet" : "activity"}
    />
  );
}
