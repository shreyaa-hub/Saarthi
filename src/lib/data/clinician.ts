import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

type Client = SupabaseClient<Database>;

export async function getDashboardStats(supabase: Client, clinicianId: string) {
  const [patients, templates, assignments, attempts] = await Promise.all([
    supabase
      .from("clinician_patients")
      .select("id", { count: "exact", head: true })
      .eq("clinician_id", clinicianId)
      .eq("status", "active"),
    supabase
      .from("templates")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", clinicianId)
      .eq("status", "published"),
    supabase
      .from("assignments")
      .select("id", { count: "exact", head: true })
      .eq("clinician_id", clinicianId)
      .neq("status", "completed"),
    supabase
      .from("activity_attempts")
      .select("id, assignments!inner(clinician_id)", { count: "exact", head: true })
      .eq("assignments.clinician_id", clinicianId),
  ]);

  return {
    activePatients: patients.count ?? 0,
    publishedTemplates: templates.count ?? 0,
    openAssignments: assignments.count ?? 0,
    totalAttempts: attempts.count ?? 0,
  };
}

export async function getRecentAttempts(supabase: Client, clinicianId: string, limit = 6) {
  const { data } = await supabase
    .from("activity_attempts")
    .select(
      "id, score, correct_count, total_count, completed_at, patient_id, assignments!inner(id, title, clinician_id), profiles!activity_attempts_patient_id_fkey(full_name)",
    )
    .eq("assignments.clinician_id", clinicianId)
    .order("completed_at", { ascending: false })
    .limit(limit);

  return data ?? [];
}

export async function getCaseload(supabase: Client, clinicianId: string) {
  const { data } = await supabase
    .from("clinician_patients")
    .select("*, profiles!clinician_patients_patient_id_fkey(full_name, email)")
    .eq("clinician_id", clinicianId)
    .order("created_at", { ascending: false });

  return data ?? [];
}

export async function getPatientDetail(
  supabase: Client,
  clinicianId: string,
  clinicianPatientId: string,
) {
  const { data: link } = await supabase
    .from("clinician_patients")
    .select("*, profiles!clinician_patients_patient_id_fkey(full_name, email)")
    .eq("clinician_id", clinicianId)
    .eq("id", clinicianPatientId)
    .single();

  if (!link) return null;

  const [assignmentsRes, insightsRes] = await Promise.all([
    link.patient_id
      ? supabase
          .from("assignments")
          .select("*")
          .eq("clinician_id", clinicianId)
          .eq("patient_id", link.patient_id)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    link.patient_id
      ? supabase
          .from("ai_insights")
          .select("*")
          .eq("clinician_id", clinicianId)
          .eq("patient_id", link.patient_id)
          .order("generated_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const assignments = assignmentsRes.data ?? [];
  const assignmentIds = assignments.map((a) => a.id);

  const { data: attempts } = assignmentIds.length
    ? await supabase
        .from("activity_attempts")
        .select("*")
        .in("assignment_id", assignmentIds)
        .order("completed_at", { ascending: true })
    : { data: [] };

  return {
    link,
    assignments,
    attempts: attempts ?? [],
    latestInsight: insightsRes.data ?? null,
  };
}

export async function getTemplates(supabase: Client, ownerId: string) {
  const { data } = await supabase
    .from("templates")
    .select("*")
    .eq("owner_id", ownerId)
    .order("updated_at", { ascending: false });

  return data ?? [];
}

export async function getAssignments(supabase: Client, clinicianId: string) {
  const { data } = await supabase
    .from("assignments")
    .select("*, profiles!assignments_patient_id_fkey(full_name)")
    .eq("clinician_id", clinicianId)
    .order("created_at", { ascending: false });

  return data ?? [];
}

export async function getActivePatientsForAssignment(supabase: Client, clinicianId: string) {
  const { data } = await supabase
    .from("clinician_patients")
    .select("id, patient_id, display_name, profiles!clinician_patients_patient_id_fkey(full_name)")
    .eq("clinician_id", clinicianId)
    .eq("status", "active")
    .not("patient_id", "is", null);

  return data ?? [];
}
