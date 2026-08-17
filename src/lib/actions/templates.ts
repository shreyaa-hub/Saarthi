"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { EMPTY_CANVAS, EMPTY_WORKSHEET_CANVAS, type TemplateCanvas, type TemplateMedium } from "@/lib/types/canvas";
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

// Turns a guest draft (built at /try while logged out, held in localStorage)
// into a real template owned by the user who just signed up. Works for both
// clinicians and parents — ownership is templates.owner_id in either case, so
// no role branching is needed beyond where we send them afterwards.
//
// Parent-authored worksheets are public by default, matching
// createParentWorksheet; a clinician's start private, matching the Studio.
export async function claimGuestDraft(input: {
  title: string;
  domain: string;
  canvas: TemplateCanvas;
}): Promise<{ error: string | null; templateId?: string; role?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const role = profile?.role ?? "patient";
  if (role !== "clinician" && role !== "parent") {
    return { error: "Only clinician and parent accounts can keep worksheets." };
  }

  const { data, error } = await supabase
    .from("templates")
    .insert({
      owner_id: user.id,
      title: input.title.trim() || "Untitled worksheet",
      domain: input.domain,
      medium: "print",
      canvas: input.canvas,
      is_public: role === "parent",
      thumbnail_color: randomThumbnailColor(),
    })
    .select("id")
    .single();

  if (error || !data) return { error: error?.message ?? "Could not save the worksheet." };

  revalidatePath(role === "parent" ? "/parent/creator-hub" : "/clinician/studio");
  return { error: null, templateId: data.id, role };
}

export async function createClinicianWorksheet(
  _prevState: { error: string | null },
  formData: FormData,
): Promise<{ error: string | null }> {
  const title = String(formData.get("title") || "").trim();
  const domain = String(formData.get("domain") || "General");

  if (!title) return { error: "Give your worksheet a name." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data, error } = await supabase
    .from("templates")
    .insert({
      owner_id: user.id,
      title,
      domain,
      medium: "print",
      canvas: EMPTY_WORKSHEET_CANVAS,
      thumbnail_color: randomThumbnailColor(),
    })
    .select("id")
    .single();

  if (error || !data) return { error: error?.message ?? "Could not create the worksheet." };

  revalidatePath("/clinician/studio");
  redirect(`/clinician/studio/${data.id}`);
}

export async function saveTemplateCanvas(
  templateId: string,
  canvas: TemplateCanvas,
  lastKnownUpdatedAt: string,
  force = false,
): Promise<{ error: string | null; conflict?: boolean; updatedAt?: string }> {
  const supabase = await createClient();

  // Optimistic-concurrency check: if the row changed server-side since this
  // editor last loaded/saved it (another tab, another device), don't
  // silently clobber that work — surface a conflict instead. `force` skips
  // this after the clinician has explicitly chosen to overwrite.
  if (!force) {
    const { data: current } = await supabase
      .from("templates")
      .select("updated_at")
      .eq("id", templateId)
      .single();

    if (current && current.updated_at !== lastKnownUpdatedAt) {
      return { error: null, conflict: true, updatedAt: current.updated_at };
    }
  }

  const { data, error } = await supabase
    .from("templates")
    .update({ canvas })
    .eq("id", templateId)
    .select("updated_at")
    .single();

  return { error: error?.message ?? null, updatedAt: data?.updated_at };
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

// Soft delete — moves the template to the Trash instead of destroying it
// outright, so an accidental click (or a change of mind) is recoverable.
export async function deleteTemplate(templateId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("templates")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", templateId);
  revalidatePath("/clinician/studio");
  revalidatePath("/clinician/studio/trash");
  return { error: error?.message ?? null };
}

export async function restoreTemplate(templateId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("templates")
    .update({ deleted_at: null })
    .eq("id", templateId);
  revalidatePath("/clinician/studio");
  revalidatePath("/clinician/studio/trash");
  return { error: error?.message ?? null };
}

// Permanent delete — only reachable from the Trash view, behind its own
// confirmation, since this one can't be undone.
export async function purgeTemplate(templateId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("templates").delete().eq("id", templateId);
  revalidatePath("/clinician/studio/trash");
  return { error: error?.message ?? null };
}
