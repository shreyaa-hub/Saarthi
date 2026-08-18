"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { randomThumbnailColor } from "@/lib/canvas/colors";
import { getPublicTemplateDetail } from "@/lib/data/library";

async function requireClinician(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." as const, user: null };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "clinician") return { error: "Clinicians only." as const, user: null };

  return { error: null, user };
}

// Importing is for whoever authors on the canvas — clinicians and parents
// both do. Patients are excluded deliberately: they have no library of their
// own to import into, and the library offers them practice instead.
async function requireAuthor(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." as const, user: null, role: null };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "clinician" && profile?.role !== "parent") {
    return { error: "Only clinicians and parents can import." as const, user: null, role: null };
  }

  return { error: null, user, role: profile.role as "clinician" | "parent" };
}

export async function setTemplatePublic(templateId: string, isPublic: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from("templates").update({ is_public: isPublic }).eq("id", templateId);

  revalidatePath("/clinician/studio");
  revalidatePath("/library/templates");
  revalidatePath("/library/worksheets");
  return { error: error?.message ?? null };
}

// Copies a published library item into the caller's own library — same idea
// as duplicateTemplate, except the source isn't owned by the caller, so it
// relies on the templates_public_select RLS policy to be readable at all.
//
// The copy is exactly that: a new row owned by the importer. Editing it can
// never reach back to the original, and it starts private regardless of how
// the source was shared, so importing something never republishes it under a
// second name.
export async function importTemplate(templateId: string) {
  const supabase = await createClient();
  const { error: authError, user, role } = await requireAuthor(supabase);
  if (authError || !user) return { error: authError ?? "Not signed in." };

  const { data: original } = await supabase
    .from("templates")
    .select("title, description, domain, medium, canvas")
    .eq("id", templateId)
    .eq("is_public", true)
    .is("deleted_at", null)
    .single();

  if (!original) return { error: "That library item is no longer available." };

  const { data, error } = await supabase
    .from("templates")
    .insert({
      owner_id: user.id,
      title: `${original.title} (imported)`,
      description: original.description,
      domain: original.domain,
      medium: original.medium,
      canvas: original.canvas,
      thumbnail_color: randomThumbnailColor(),
      status: "draft",
      is_public: false,
    })
    .select("id")
    .single();

  if (error || !data) return { error: error?.message ?? "Could not import." };

  if (role === "parent") {
    revalidatePath("/parent/creator-hub");
    redirect(`/parent/studio/${data.id}`);
  }

  revalidatePath("/clinician/studio");
  redirect(`/clinician/studio/${data.id}`);
}

export async function publishAsset(url: string, alt: string) {
  const supabase = await createClient();
  const { error: authError, user } = await requireClinician(supabase);
  if (authError || !user) return { error: authError ?? "Not signed in." };

  if (!url.trim()) return { error: "Missing image." };

  const { error } = await supabase.from("assets").insert({
    owner_id: user.id,
    url: url.trim(),
    alt: alt.trim() || "Shared asset",
  });

  revalidatePath("/library/assets");
  return { error: error?.message ?? null };
}

export async function deleteAsset(assetId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("assets").delete().eq("id", assetId);

  revalidatePath("/library/assets");
  return { error: error?.message ?? null };
}

// Loads one library item's canvas for the preview dialog. Readable by anyone,
// signed in or not, because templates_public_select governs it — which is the
// point: a visitor sees what the platform makes before deciding to join.
export async function loadTemplatePreview(templateId: string) {
  const supabase = await createClient();
  const detail = await getPublicTemplateDetail(supabase, templateId);
  if (!detail) return { error: "That library item is no longer available.", detail: null };
  return { error: null, detail };
}
