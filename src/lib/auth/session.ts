import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

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
    redirect(profile.role === "clinician" ? "/clinician" : "/patient");
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
