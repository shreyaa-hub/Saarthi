"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { notify } from "@/lib/actions/notifications";
import { reviewCanvas, type ReviewItem } from "@/lib/review";
import type { Responses } from "@/lib/scoring";
import type { TemplateCanvas } from "@/lib/types/canvas";

// One attempt, question by question: what was asked, what the patient
// answered, and what would have been right.
//
// Loaded on demand rather than with the attempt list. A canvas_snapshot is a
// whole activity — every option, every image reference — and a patient with
// forty attempts would otherwise ship forty of them to the browser to render
// a list of scores, when the clinician opens one.
//
// Marked against canvas_snapshot, the copy of the activity as it was actually
// assigned, not the live template. If it were read from the template, editing
// an activity would silently rewrite the answer key of every attempt already
// made against it, and a past attempt would start showing questions the
// patient was never asked.
//
// No authorization here on purpose: activity_attempts_clinician_select
// already scopes this select to attempts the caller may read, so a row for
// somebody else's patient comes back empty rather than needing a second
// check that could drift from the policy.
export async function getAttemptReview(
  attemptId: string,
): Promise<{ error: string | null; items?: ReviewItem[]; title?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("activity_attempts")
    .select("responses, assignments!inner(title, canvas_snapshot)")
    .eq("id", attemptId)
    .maybeSingle();

  if (error) return { error: error.message };
  if (!data) return { error: "That attempt could not be found." };

  const assignment = data.assignments as unknown as {
    title: string;
    canvas_snapshot: TemplateCanvas | null;
  } | null;
  if (!assignment?.canvas_snapshot) {
    return { error: "This attempt has no saved copy of the activity to mark against." };
  }

  // responses is jsonb and can be anything, including null on a row written
  // before the player stored them. An object or nothing.
  const responses: Responses =
    data.responses && typeof data.responses === "object" && !Array.isArray(data.responses)
      ? (data.responses as Responses)
      : {};

  return {
    error: null,
    title: assignment.title,
    items: reviewCanvas(assignment.canvas_snapshot, responses),
  };
}

export async function setAttemptNote(attemptId: string, clinicianPatientId: string, note: string) {
  const supabase = await createClient();
  const trimmed = note.trim();
  const { data: attempt, error } = await supabase
    .from("activity_attempts")
    .update({ clinician_note: trimmed || null })
    .eq("id", attemptId)
    .select("patient_id, assignments(title)")
    .single();

  if (!error && attempt && trimmed) {
    const title = (attempt.assignments as { title?: string } | null)?.title ?? "an activity";
    await notify(
      supabase,
      attempt.patient_id,
      "clinician_note",
      "Your clinician left a note",
      `On "${title}": ${trimmed}`,
      "/patient/progress",
    );
  }

  revalidatePath(`/clinician/caseload/${clinicianPatientId}`);
  return { error: error?.message ?? null };
}
