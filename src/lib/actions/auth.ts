"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type ActionState = { error: string | null; message?: string | null };

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

  redirect(profile?.role === "clinician" ? "/clinician" : "/patient");
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

  if (error) return { error: error.message };

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

  if (error) return { error: error.message };

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

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
