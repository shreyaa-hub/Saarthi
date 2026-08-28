"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { TemplateCanvas, TemplateMedium } from "@/lib/types/canvas";
import { randomThumbnailColor } from "@/lib/canvas/colors";
import { getPublicTemplateDetail } from "@/lib/data/library";
import { getStarter, isStarterId } from "@/lib/canvas/starters";

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

// A starter in the shape the import insert and the preview dialog expect, so
// neither has to know whether it came from code or from the database.
function starterAsRow(id: string) {
  const s = getStarter(id);
  if (!s) return null;
  return {
    title: s.title,
    description: s.description as string | null,
    domain: s.domain as string,
    // Widened to the column's own union rather than to plain string: the
    // insert below types `medium` as that union, and a starter's medium is
    // always one of its members by construction.
    medium: s.medium,
    canvas: s.canvas,
  };
}

function starterAsDetail(s: NonNullable<ReturnType<typeof getStarter>>) {
  return {
    id: s.id,
    title: s.title,
    description: s.description,
    domain: s.domain as string,
    medium: s.medium as string,
    canvas: s.canvas,
    updated_at: new Date(0).toISOString(),
  };
}

export async function setTemplatePublic(templateId: string, isPublic: boolean) {
  const supabase = await createClient();
  // templates_owner_all is what actually decides this, and a row it refuses
  // is filtered out rather than raising — so without reading back what was
  // updated, sharing somebody else's template returned success and the UI
  // said "Shared to the Global Library" over a change that never happened.
  const { data, error } = await supabase
    .from("templates")
    .update({ is_public: isPublic })
    .eq("id", templateId)
    .select("id")
    .maybeSingle();

  if (error) return { error: error.message };
  if (!data) return { error: "That template isn't yours to share." };

  revalidatePath("/clinician/studio");
  revalidatePath("/library/templates");
  revalidatePath("/library/worksheets");
  return { error: null };
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

  // A starter is a built-in example that lives in code, not a row anybody
  // owns (see lib/canvas/starters.ts). Importing one is otherwise identical:
  // the copy below is an ordinary template row owned by the importer, so from
  // this moment it behaves like anything else in their library.
  const original = isStarterId(templateId)
    ? starterAsRow(templateId)
    : (
        await supabase
          .from("templates")
          .select("title, description, domain, medium, canvas")
          .eq("id", templateId)
          .eq("is_public", true)
          .is("deleted_at", null)
          .single()
      ).data;

  if (!original) return { error: "That library item is no longer available." };

  const { data, error } = await supabase
    .from("templates")
    .insert({
      owner_id: user.id,
      title: `${original.title} (imported)`,
      description: original.description,
      domain: original.domain,
      medium: original.medium as TemplateMedium,
      canvas: original.canvas as TemplateCanvas,
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
  // Same reasoning as setTemplatePublic: assets_owner_write filters somebody
  // else's row out of the delete instead of refusing it, so the caller has to
  // read back whether anything actually went.
  const { data, error } = await supabase
    .from("assets")
    .delete()
    .eq("id", assetId)
    .select("id")
    .maybeSingle();

  if (error) return { error: error.message };
  if (!data) return { error: "That asset isn't yours to delete." };

  revalidatePath("/library/assets");
  return { error: null };
}

// Loads one library item's canvas for the preview dialog. Readable by anyone,
// signed in or not, because templates_public_select governs it — which is the
// point: a visitor sees what the platform makes before deciding to join.
export async function loadTemplatePreview(templateId: string) {
  if (isStarterId(templateId)) {
    const starter = getStarter(templateId);
    if (!starter) return { error: "That starter no longer exists.", detail: null };
    return { error: null, detail: starterAsDetail(starter) };
  }

  const supabase = await createClient();
  const detail = await getPublicTemplateDetail(supabase, templateId);
  if (!detail) return { error: "That library item is no longer available.", detail: null };
  return { error: null, detail };
}
