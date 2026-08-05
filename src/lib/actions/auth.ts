"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { homeForRole } from "@/lib/auth/session";

export type ActionState = { error: string | null; message?: string | null };

// Supabase surfaces a failure inside the handle_new_user() trigger as an
// opaque auth error whose message can arrive empty or as a stringified empty
// body — which is how a signup blocked by the profiles role CHECK constraint
// ends up rendering as a literal "{}" in the form. Never show the raw value
// in that case: log it for the server and give the operator something they
// can actually act on.
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

  redirect(homeForRole(profile?.role ?? "patient"));
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

  redirect("/clinician");
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

  if (error) return { error: describeAuthError(error, "signUpParent") };

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

  redirect("/parent");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
