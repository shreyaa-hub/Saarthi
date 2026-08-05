import type { ProfileRole } from "@/lib/types/database";

// Deliberately dependency-free: the proxy (proxy.ts → supabase/middleware)
// imports this too, and it runs in a context where anything touching
// next/headers or the server Supabase client would blow up. Keeping the
// role→route map here means the proxy and requireProfile() can never drift
// into disagreeing about where a role belongs.
export function homeForRole(role: ProfileRole): string {
  if (role === "clinician") return "/clinician";
  if (role === "parent") return "/parent";
  return "/patient";
}

// The role prefixes that require a signed-in user. Order matters only for
// readability; membership is what the proxy checks.
export const ROLE_ROUTE_PREFIXES = ["/clinician", "/patient", "/parent"] as const;

// Narrows an untrusted value (a JWT metadata claim) to a real role. Anything
// unrecognised falls back to "patient", matching handle_new_user()'s own
// default so a malformed claim lands somewhere coherent rather than nowhere.
export function asProfileRole(value: unknown): ProfileRole {
  return value === "clinician" || value === "parent" || value === "patient" ? value : "patient";
}
