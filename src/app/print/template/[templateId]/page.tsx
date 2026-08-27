import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOptionalViewer } from "@/lib/auth/session";
import { homeForRole } from "@/lib/auth/roles";
import type { TemplateCanvas } from "@/lib/types/canvas";
import { PrintableCanvas } from "@/components/print/printable-canvas";
import { PrintBar } from "@/components/print/print-bar";

// Printable view of a template, for whoever is allowed to read it.
//
// Deliberately one route rather than a per-role copy: the templates table's
// RLS already answers "may this person see this template" — the owner, and
// anyone at all for a published one. Selecting the row and treating an empty
// result as not-found reuses that single answer instead of restating it in
// three places that could drift apart.
//
// Outside every role shell, like the clinician report, because a printable
// page must not carry app chrome onto the paper.
export default async function PrintTemplatePage({
  params,
}: {
  params: Promise<{ templateId: string }>;
}) {
  const { templateId } = await params;
  const supabase = await createClient();

  const { data: template } = await supabase
    .from("templates")
    .select("id, title, domain, canvas")
    .eq("id", templateId)
    .single();

  if (!template) notFound();

  // Signed-out visitors can reach this for a published worksheet, so the
  // back link has to lead somewhere that exists for them too.
  const { role } = await getOptionalViewer();
  const backHref = role ? homeForRole(role) : "/library/worksheets";

  return (
    <div className="min-h-screen bg-white">
      <PrintBar title={template.title} subtitle={template.domain} backHref={backHref} />
      <div className="flex flex-col items-center px-4 py-8 print:p-0">
        <PrintableCanvas canvas={template.canvas as TemplateCanvas} />
      </div>
    </div>
  );
}
