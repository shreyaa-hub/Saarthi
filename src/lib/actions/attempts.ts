"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { notify } from "@/lib/actions/notifications";

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
