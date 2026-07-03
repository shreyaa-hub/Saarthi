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

  const { data: template } = await supabase
    .from("templates")
    .select("id, title, domain, medium, status, canvas")
    .eq("id", templateId)
    .eq("owner_id", user.id)
    .single();

  if (!template) notFound();

  return <CanvasEditor template={template} />;
}
