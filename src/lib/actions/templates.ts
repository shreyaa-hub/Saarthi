"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { EMPTY_CANVAS, type TemplateCanvas, type TemplateMedium } from "@/lib/types/canvas";
import { getBlueprint } from "@/lib/canvas/blueprints";
import { randomThumbnailColor } from "@/lib/canvas/colors";

export type WizardSource =
  | { type: "blank" }
  | { type: "blueprint"; blueprintId: string }
  | { type: "existing"; templateId: string };

// Backs the Initialize wizard (Medium -> Foundation -> Identity -> Canvas):
// resolves the starting canvas from whichever Foundation path the clinician
// took, then creates the template and opens the editor.
export async function createTemplateFromWizard(input: {
  medium: TemplateMedium;
  title: string;
  domain: string;
  subdomain?: string;
  source: WizardSource;
}): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  let canvas: TemplateCanvas = EMPTY_CANVAS;

  if (input.source.type === "blueprint") {
    const blueprint = getBlueprint(input.source.blueprintId);
    if (!blueprint) return { error: "That blueprint could not be found." };
    canvas = blueprint.canvas;
  } else if (input.source.type === "existing") {
    const { data: existing } = await supabase
      .from("templates")
      .select("canvas")
      .eq("id", input.source.templateId)
      .eq("owner_id", user.id)
      .single();
    if (!existing) return { error: "That template could not be found." };
    canvas = existing.canvas;
  }

  const title = input.title.trim() || "Untitled template";
  const description = input.subdomain?.trim() ? `Subdomain: ${input.subdomain.trim()}` : null;

  const { data, error } = await supabase
    .from("templates")
    .insert({
      owner_id: user.id,
      title,
      domain: input.domain,
      medium: input.medium,
      description,
      canvas,
      thumbnail_color: randomThumbnailColor(),
    })
    .select("id")
    .single();

  if (error || !data) return { error: error?.message ?? "Could not create template." };

  revalidatePath("/clinician/studio");
  redirect(`/clinician/studio/${data.id}`);
}

export async function saveTemplateCanvas(templateId: string, canvas: TemplateCanvas) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("templates")
    .update({ canvas })
    .eq("id", templateId);

  return { error: error?.message ?? null };
}

export async function updateTemplateMeta(
  templateId: string,
  fields: { title?: string; description?: string; domain?: string },
) {
  const supabase = await createClient();
  const { error } = await supabase.from("templates").update(fields).eq("id", templateId);
  revalidatePath(`/clinician/studio/${templateId}`);
  return { error: error?.message ?? null };
}

export async function setTemplateStatus(
  templateId: string,
  status: "draft" | "published" | "archived",
) {
  const supabase = await createClient();
  const { error } = await supabase.from("templates").update({ status }).eq("id", templateId);
  revalidatePath(`/clinician/studio/${templateId}`);
  revalidatePath("/clinician/studio");
  return { error: error?.message ?? null };
}

export async function duplicateTemplate(templateId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: original } = await supabase
    .from("templates")
    .select("*")
    .eq("id", templateId)
    .single();

  if (!original) return { error: "Template not found." };

  const { error } = await supabase.from("templates").insert({
    owner_id: user.id,
    title: `${original.title} (copy)`,
    description: original.description,
    domain: original.domain,
    medium: original.medium,
    canvas: original.canvas,
    thumbnail_color: original.thumbnail_color,
    status: "draft",
  });

  revalidatePath("/clinician/studio");
  return { error: error?.message ?? null };
}

export async function deleteTemplate(templateId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("templates").delete().eq("id", templateId);
  revalidatePath("/clinician/studio");
  return { error: error?.message ?? null };
}
