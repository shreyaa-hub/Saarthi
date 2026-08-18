import type { SupabaseClient, PostgrestError } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

type Client = SupabaseClient<Database>;

function logIfError(context: string, error: PostgrestError | null) {
  if (error) console.error(`[data/parent] ${context}:`, error.message, error.details);
}

// One child as the parent area thinks of them: the guardian link plus the
// child's own profile and the clinician treating them. `clinicianPatientId`
// is what the child's caseload row is keyed by; `id` is the guardian link,
// which is what the parent's own message thread is keyed by. Keeping both
// distinct here stops call sites guessing which id a given feature wants.
export type ParentChild = {
  id: string;
  childId: string;
  name: string;
  clinicianPatientId: string | null;
  clinicianId: string | null;
  clinicianName: string | null;
};

type ChildRow = {
  id: string;
  child_id: string;
  clinician_patient_id: string | null;
  profiles: { full_name: string } | null;
  clinician_patients: {
    clinician_id: string;
    profiles: { full_name: string } | null;
  } | null;
};

const CHILD_SELECT =
  "id, child_id, clinician_patient_id, " +
  "profiles!parent_children_child_id_fkey(full_name), " +
  "clinician_patients(clinician_id, profiles!clinician_patients_clinician_id_fkey(full_name))";

export async function getMyChildren(supabase: Client, parentId: string): Promise<ParentChild[]> {
  const { data, error } = await supabase
    .from("parent_children")
    .select(CHILD_SELECT)
    .eq("parent_id", parentId)
    .order("created_at", { ascending: true });

  logIfError("getMyChildren", error);

  return ((data ?? []) as unknown as ChildRow[]).map((row) => ({
    id: row.id,
    childId: row.child_id,
    name: row.profiles?.full_name ?? "Your child",
    clinicianPatientId: row.clinician_patient_id,
    clinicianId: row.clinician_patients?.clinician_id ?? null,
    clinicianName: row.clinician_patients?.profiles?.full_name ?? null,
  }));
}

// Resolves which child the parent is currently looking at. Falls back to the
// first linked child so every parent screen has a subject without the URL
// having to carry one, and returns null only when the parent has no children
// linked at all. Never trusts the requested id blindly — an id that isn't in
// this parent's own list resolves to the default, so a hand-edited query
// string can't point the UI at someone else's child. (RLS would refuse the
// underlying rows regardless; this just keeps the UI coherent instead of
// rendering an empty page.)
export function resolveSelectedChild(
  children: ParentChild[],
  requestedChildId?: string,
): ParentChild | null {
  if (children.length === 0) return null;
  if (!requestedChildId) return children[0];
  return children.find((c) => c.childId === requestedChildId) ?? children[0];
}

export async function getChildAssignments(supabase: Client, childId: string) {
  const { data, error } = await supabase
    .from("assignments")
    .select("*")
    .eq("patient_id", childId)
    .order("created_at", { ascending: false });

  logIfError("getChildAssignments", error);
  return data ?? [];
}

// `assignments.clinician_id` comes back so the progress view can distinguish
// clinician-prescribed therapy from home practice a parent sent themselves.
// The two are deliberately NOT merged into one headline number: the
// clinician's own analytics only count clinician-assigned work (their RLS and
// their queries both filter on clinician_id), so presenting a combined figure
// here would put a number in front of a parent that their clinician can never
// reproduce.
export async function getChildAttempts(supabase: Client, childId: string) {
  const { data, error } = await supabase
    .from("activity_attempts")
    .select("*, assignments(title, clinician_id)")
    .eq("patient_id", childId)
    .order("completed_at", { ascending: false });

  logIfError("getChildAttempts", error);
  return data ?? [];
}

type AttemptWithAssignment = { assignments?: { clinician_id?: string | null } | null };

export function isHomePractice(attempt: unknown): boolean {
  return (attempt as AttemptWithAssignment).assignments?.clinician_id == null;
}

export async function getMyInvoices(supabase: Client, parentId: string) {
  const { data, error } = await supabase
    .from("invoices")
    .select("*, profiles!invoices_clinician_id_fkey(full_name)")
    .eq("parent_id", parentId)
    .order("issued_at", { ascending: false });

  logIfError("getMyInvoices", error);
  return data ?? [];
}

// Everything this parent authored themselves, activities and worksheets
// alike, as opposed to getSavedWorksheets below, which is their shortlist of
// other people's published material. The caller splits on medium.
export async function getMyTemplates(supabase: Client, parentId: string) {
  const { data, error } = await supabase
    .from("templates")
    .select("id, title, domain, medium, status, is_public, thumbnail_color, updated_at")
    .eq("owner_id", parentId)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });

  logIfError("getMyTemplates", error);
  return data ?? [];
}

export async function getSavedWorksheets(supabase: Client, parentId: string) {
  const { data, error } = await supabase
    .from("parent_saved_worksheets")
    .select("*, templates(id, title, domain, medium, thumbnail_color, is_public)")
    .eq("parent_id", parentId)
    .order("created_at", { ascending: false });

  logIfError("getSavedWorksheets", error);
  // A template that has since been unpublished stops resolving through RLS
  // and comes back as null — drop those rather than rendering an empty card.
  return (data ?? []).filter((row) => row.templates !== null);
}
