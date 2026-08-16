"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { homeForRole } from "@/lib/auth/session";
import type { ProfileRole } from "@/lib/types/database";

export type ActionState = { error: string | null; message?: string | null };

// Where to land after authenticating. `next=claim` means the user came from
// the public /try Studio with a worksheet waiting in their browser, so they
// go straight to the screen that offers to keep it rather than to their
// dashboard, where the offer would be nowhere in sight.
function destinationFor(role: ProfileRole, next?: string | null): string {
  if (next === "claim") {
    if (role === "clinician") return "/clinician/studio";
    if (role === "parent") return "/parent/creator-hub";
  }
  return homeForRole(role);
}

// The proxy bounces an unauthenticated request to /sign-in?redirect=<path>.
// Honour it so signing in returns you to the page you actually asked for,
// but only for same-origin absolute paths: anything else (a full URL, or a
// protocol-relative "//evil.example") would be an open redirect.
function safeRedirect(target?: string | null): string | null {
  if (!target) return null;
  if (!target.startsWith("/") || target.startsWith("//")) return null;
  return target;
}

// Supabase surfaces a failure inside the handle_new_user() trigger as an
// opaque auth error whose message can arrive empty or as a stringified empty
// body — which is how a signup blocked by the profiles role CHECK constraint
// ends up rendering as a literal "{}" in the form. Never show the raw value
// in that case: log it for the server and give the operator something they
// can actually act on.
// Distinguishes "0002_parents.sql was never applied" from any other
// server-side signup failure. Supabase reports a handle_new_user() trigger
// failure as an opaque auth error, so the sign-up response alone can't tell
// us why the insert was refused — but parent_children only exists after that
// migration, so probing for it answers the question directly instead of
// leaving the operator to guess.
async function parentSchemaMissing(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<boolean> {
  const { error } = await supabase.from("parent_children").select("id").limit(1);
  if (!error) return false;
  // PGRST205: table absent from PostgREST's schema cache.
  return error.code === "PGRST205" || /does not exist|schema cache/i.test(error.message ?? "");
}

function describeAuthError(error: { message?: string | null }, context: string): string {
  const raw = (error.message ?? "").trim();
  const isUseless = raw === "" || raw === "{}" || raw === "[object Object]";

  console.error(`[actions/auth] ${context} failed:`, error);

  if (!isUseless) return raw;
  return (
    "Could not create the account. The database rejected the new user — " +
    "if this is a fresh deployment, check that every migration in " +
    "supabase/migrations has been applied."
  );
}

export async function signIn(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  // The profiles table, not the JWT's metadata, is the source of truth for
  // role — they can drift apart (e.g. a role edited directly in the
  // database), and trusting the JWT here would send the user to a page
  // whose own auth check disagrees and bounces them right back.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();

  const role = profile?.role ?? "patient";
  const requested = safeRedirect(String(formData.get("redirect") || ""));
  redirect(requested ?? destinationFor(role, String(formData.get("next") || "")));
}

export async function signUpClinician(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const fullName = String(formData.get("full_name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const clinicName = String(formData.get("clinic_name") || "").trim();

  if (!fullName || !email || !password) {
    return { error: "Fill in your name, email, and password." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        role: "clinician",
        full_name: fullName,
        headline: clinicName || null,
      },
    },
  });

  if (error) return { error: describeAuthError(error, "signUpClinician") };

  if (!data.session) {
    return {
      error: null,
      message: "Account created. Check your email to confirm, then sign in.",
    };
  }

  redirect(destinationFor("clinician", String(formData.get("next") || "")));
}

export async function signUpPatient(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const fullName = String(formData.get("full_name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const inviteCode = String(formData.get("invite_code") || "").trim().toUpperCase();

  if (!fullName || !email || !password) {
    return { error: "Fill in your name, email, and password." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { role: "patient", full_name: fullName },
    },
  });

  if (error) return { error: describeAuthError(error, "signUpPatient") };

  if (!data.session) {
    return {
      error: null,
      message: "Account created. Check your email to confirm, then sign in.",
    };
  }

  if (inviteCode) {
    const { error: claimError } = await supabase.rpc("claim_invite", {
      p_invite_code: inviteCode,
    });
    if (claimError) {
      return {
        error: null,
        message: `Account created, but the invite code was invalid: ${claimError.message}. You can enter it again from your dashboard.`,
      };
    }
  }

  redirect("/patient");
}

export async function signUpParent(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const fullName = String(formData.get("full_name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const guardianCode = String(formData.get("guardian_code") || "").trim().toUpperCase();

  if (!fullName || !email || !password) {
    return { error: "Fill in your name, email, and password." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { role: "parent", full_name: fullName },
    },
  });

  if (error) {
    if (await parentSchemaMissing(supabase)) {
      return {
        error:
          "Parent accounts aren't enabled on this database yet — " +
          "supabase/migrations/0002_parents.sql has not been applied. " +
          "Run that file in the Supabase SQL editor, then try again.",
      };
    }
    return { error: describeAuthError(error, "signUpParent") };
  }

  if (!data.session) {
    return {
      error: null,
      message: "Account created. Check your email to confirm, then sign in.",
    };
  }

  // Same shape as signUpPatient's invite handling: a bad code must never
  // strand a successfully created account, so it reports back and leaves the
  // parent to retry from their dashboard.
  if (guardianCode) {
    const { error: linkError } = await supabase.rpc("claim_guardian_code", {
      p_guardian_code: guardianCode,
    });
    if (linkError) {
      return {
        error: null,
        message: `Account created, but the guardian code was not accepted: ${linkError.message} You can enter it again from your dashboard.`,
      };
    }
  }

  redirect(destinationFor("parent", String(formData.get("next") || "")));
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
