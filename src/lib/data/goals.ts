import type { SupabaseClient, PostgrestError } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import type { PatientGoal } from "@/lib/goals";

type Client = SupabaseClient<Database>;

function logIfError(context: string, error: PostgrestError | null) {
  if (error) console.error(`[data/goals] ${context}:`, error.message, error.details);
}

type GoalRow = Database["public"]["Tables"]["patient_goals"]["Row"];

function normalize(row: GoalRow): PatientGoal {
  return {
    id: row.id,
    patientId: row.patient_id,
    clinicianId: row.clinician_id,
    title: row.title,
    domain: row.domain,
    targetAccuracy: row.target_accuracy,
    windowAttempts: row.window_attempts,
    status: row.status,
    createdAt: row.created_at,
    achievedAt: row.achieved_at,
  };
}

// One patient's goals, newest first, with the achieved and archived ones
// still present — a discharge summary needs to say what was worked on and
// met, not only what is outstanding. Callers filter by status for display.
//
// No caller-side scoping: the three patient_goals SELECT policies already
// decide whether the reader is the treating clinician, the patient or their
// guardian, so the same function serves all three shells.
export async function getPatientGoals(
  supabase: Client,
  patientId: string,
): Promise<PatientGoal[]> {
  const { data, error } = await supabase
    .from("patient_goals")
    .select("*")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });

  logIfError("getPatientGoals", error);
  return (data ?? []).map(normalize);
}
