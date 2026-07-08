"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function setAttemptNote(attemptId: string, clinicianPatientId: string, note: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("activity_attempts")
    .update({ clinician_note: note.trim() || null })
    .eq("id", attemptId);

  revalidatePath(`/clinician/caseload/${clinicianPatientId}`);
  return { error: error?.message ?? null };
}
