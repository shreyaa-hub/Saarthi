import type { SupabaseClient, PostgrestError } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

type Client = SupabaseClient<Database>;

function logIfError(context: string, error: PostgrestError | null) {
  if (error) console.error(`[data/patient] ${context}:`, error.message, error.details);
}

export async function getMyAssignments(supabase: Client, patientId: string) {
  const { data, error } = await supabase
    .from("assignments")
    .select("*")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });

  logIfError("getMyAssignments", error);
  return data ?? [];
}

export async function getAssignmentForPlay(supabase: Client, patientId: string, assignmentId: string) {
  const { data, error } = await supabase
    .from("assignments")
    .select("*")
    .eq("patient_id", patientId)
    .eq("id", assignmentId)
    .single();

  logIfError("getAssignmentForPlay", error);
  return data;
}

export async function getMyAttempts(supabase: Client, patientId: string) {
  const { data, error } = await supabase
    .from("activity_attempts")
    .select("*, assignments(title)")
    .eq("patient_id", patientId)
    .order("completed_at", { ascending: false });

  logIfError("getMyAttempts", error);
  return data ?? [];
}

export function computeStreak(completedDates: string[]): number {
  const days = new Set(completedDates.map((d) => new Date(d).toDateString()));
  let streak = 0;
  const cursor = new Date();
  // Allow "today not done yet" to not break a streak that includes yesterday.
  if (!days.has(cursor.toDateString())) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (days.has(cursor.toDateString())) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export async function getMyClinician(supabase: Client, patientId: string) {
  const { data, error } = await supabase
    .from("clinician_patients")
    .select("clinician_id, profiles!clinician_patients_clinician_id_fkey(full_name, headline)")
    .eq("patient_id", patientId)
    .eq("status", "active")
    .maybeSingle();

  logIfError("getMyClinician", error);
  return data;
}

// Unlike getMyClinician() above, returns every active relationship rather
// than assuming exactly one. clinician_patients.patient_id has no
// uniqueness constraint, so a patient can have more than one active
// clinician — Messenger needs to know that explicitly (to offer a
// conversation switcher) rather than risk .maybeSingle() erroring out on
// 2+ rows. Ordered most-recently-active first so callers have a sensible
// default when none is explicitly selected. Includes the
// clinician_patients row id, which start_conversation() requires and
// getMyClinician() doesn't currently select.
export async function getMyActiveClinicians(supabase: Client, patientId: string) {
  const { data, error } = await supabase
    .from("clinician_patients")
    .select("id, clinician_id, profiles!clinician_patients_clinician_id_fkey(full_name, headline)")
    .eq("patient_id", patientId)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  logIfError("getMyActiveClinicians", error);
  return data ?? [];
}
