import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

// The single place that maps a role to its landing route. Every redirect
// after sign-in or a wrong-role bounce goes through this — a role missing
// from here would be sent to another role's shell, whose own guard would
// bounce it straight back into an infinite redirect.
export function homeForRole(role: Profile["role"]): string {
  if (role === "clinician") return "/clinician";
  if (role === "parent") return "/parent";
  return "/patient";
}

export async function requireProfile(role?: Profile["role"]) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) {
    console.error("[auth/session] requireProfile: profile lookup failed", error.message, error.details);
  }

  if (!profile) redirect("/sign-in");
  if (role && profile.role !== role) {
    redirect(homeForRole(profile.role));
  }

  return { supabase, user, profile };
}

// Non-redirecting variant for public pages (the Global Library) that render
// differently for a signed-in clinician but must still work for logged-out
// visitors — unlike requireProfile(), this never redirects.
export async function getOptionalClinician() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, clinicianId: null };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  return { supabase, clinicianId: profile?.role === "clinician" ? user.id : null };
}
