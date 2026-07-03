"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { EMPTY_CANVAS, type TemplateCanvas, type TemplateMedium } from "@/lib/types/canvas";
import type { ActionState } from "@/lib/actions/auth";

const THUMBNAIL_COLORS = ["#1e6f6a", "#f5a623", "#5b6bd6", "#d64545", "#2f9e5b", "#a05bd6"];

export async function createTemplate(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const title = String(formData.get("title") || "Untitled template").trim();
  const domain = String(formData.get("domain") || "General");
  const medium = String(formData.get("medium") || "interactive");

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
      medium: medium as TemplateMedium,
      canvas: EMPTY_CANVAS,
      thumbnail_color: THUMBNAIL_COLORS[Math.floor(Math.random() * THUMBNAIL_COLORS.length)],
    })
    .select("id")
    .single();

  if (error || !data) return { error: error?.message ?? "Could not create template." };

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
