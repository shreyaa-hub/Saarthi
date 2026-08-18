import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { homeForRole as resolveHome } from "@/lib/auth/roles";
import type { Database } from "@/lib/types/database";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

// Re-exported so existing importers keep working; the definition lives in
// lib/auth/roles.ts because the proxy needs it too and cannot import this
// module (next/headers).
export { homeForRole } from "@/lib/auth/roles";

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
    redirect(resolveHome(profile.role));
  }

  return { supabase, user, profile };
}

// Non-redirecting variant for public pages (the Global Library), which render
// differently per role but must still work for a logged-out visitor — unlike
// requireProfile(), this never redirects.
//
// Returns the role rather than a single boolean: the library now offers
// something different to each of the three roles, and a caller that only knew
// "is a clinician" could not tell a parent from a stranger.
export async function getOptionalViewer() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, userId: null, role: null };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  return { supabase, userId: user.id, role: profile?.role ?? null };
}
