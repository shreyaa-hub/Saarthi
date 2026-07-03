import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

type Client = SupabaseClient<Database>;

export async function getMyAssignments(supabase: Client, patientId: string) {
  const { data } = await supabase
    .from("assignments")
    .select("*")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });

  return data ?? [];
}

export async function getAssignmentForPlay(supabase: Client, patientId: string, assignmentId: string) {
  const { data } = await supabase
    .from("assignments")
    .select("*")
    .eq("patient_id", patientId)
    .eq("id", assignmentId)
    .single();

  return data;
}

export async function getMyAttempts(supabase: Client, patientId: string) {
  const { data } = await supabase
    .from("activity_attempts")
    .select("*, assignments(title)")
    .eq("patient_id", patientId)
    .order("completed_at", { ascending: false });

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
  const { data } = await supabase
    .from("clinician_patients")
    .select("clinician_id, profiles!clinician_patients_clinician_id_fkey(full_name, headline)")
    .eq("patient_id", patientId)
    .eq("status", "active")
    .maybeSingle();

  return data;
}
