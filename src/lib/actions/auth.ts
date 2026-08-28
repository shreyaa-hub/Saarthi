"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { homeForRole } from "@/lib/auth/session";
import { safeRedirect } from "@/lib/auth/redirects";
import type { ProfileRole } from "@/lib/types/database";

export type ActionState = {
  error: string | null;
  message?: string | null;
  // A sentence about what the action actually did, where `message` is a
  // machine-ish outcome the caller switches on. Used by bulk assignment,
  // where "Assigned" alone leaves the clinician guessing how many rows they
  // just created.
  detail?: string | null;
};

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
// safeRedirect (lib/auth/redirects) honours it for same-origin absolute paths
// only, so signing in returns you to the page you actually asked for without
// becoming an open redirect. Shared with the email-link route handler, which
// has the identical problem with its own ?next= parameter.

// The reset link Supabase emails has to point back at *this* deployment, and
// a Server Action has no window.location to read it from. The request headers
// are the only thing that know whether this request arrived at the custom
// domain, a vercel.app preview, or localhost — hardcoding any one of them
// would silently break the other two.
//
// Origin and Host are both client-controllable, so on its own this would be a
// way to make Supabase mail somebody a link pointing at an attacker's site.
// It is not one here, because Supabase refuses to put any redirect_to in an
// email that is not in the project's Redirect URLs allowlist — that allowlist
// is the guard designed for precisely this, which is why it is worth keeping
// tight rather than setting it to a bare wildcard.
async function siteOrigin(): Promise<string> {
  const h = await headers();

  // Server Actions are POSTed by the browser, so Origin is normally present
  // and is the most precise answer.
  const origin = h.get("origin");
  if (origin) return origin;

  // Behind Vercel's proxy the original host survives as x-forwarded-host;
  // plain `host` is the platform's internal one.
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
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

// Said whether or not the address belongs to an account. A form that
// confirmed "no such user" would be a way for anyone to test which email
// addresses are registered here, and for a product holding patient
// information the membership list is itself worth protecting.
//
// Worth being straight about the limit of that: sign-up still rejects an
// existing address with "User already registered", because email confirmation
// is switched off, so the same question can be asked there and answered more
// plainly. Closing that properly means turning confirmations on, which is a
// separate decision with its own consequences. This is one hole covered, not
// the class of them.
const RESET_SENT =
  "If an account exists for that address, a reset link is on its way. " +
  "Check your inbox, and your spam folder.";

export async function requestPasswordReset(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const email = String(formData.get("email") || "").trim();

  if (!email) return { error: "Enter your email address." };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await siteOrigin()}/auth/confirm?next=/reset-password`,
  });

  if (error) {
    // Logged rather than shown: whatever went wrong, the visitor must not be
    // able to tell a delivery failure from a nonexistent account.
    console.error("[actions/auth] requestPasswordReset failed:", error);

    // The one exception. A rate-limited request sends no email at all, so the
    // neutral message above would be an outright lie and the user would sit
    // waiting for something that is never coming. This does leak a little —
    // Supabase only spends the per-address limit when the address exists — but
    // a dead-end form is a certain harm and this is a weaker signal than the
    // sign-up route already gives away.
    if (error.status === 429) {
      return { error: "Too many reset requests for now. Wait a few minutes and try again." };
    }
  }

  return { error: null, message: RESET_SENT };
}

// Reached only with a session, which the recovery link established by way of
// /auth/confirm. That session is what authorises the change, so there is no
// token to re-check here — if getUser() comes back empty the link was never
// verified, or it expired before the form was submitted.
export async function updatePassword(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const password = String(formData.get("password") || "");
  const confirm = String(formData.get("confirm_password") || "");

  // Same floor as every sign-up path, so a reset cannot be used to sneak
  // below the rule the account was created under.
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  if (password !== confirm) {
    return { error: "Those two passwords don't match." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: "That reset link has expired or was already used. Request a new one.",
    };
  }

  const { error } = await supabase.auth.updateUser({ password });

  // Surfaced as-is: these are Supabase's own rules about the password itself
  // ("should be different from the old password", a strength requirement if
  // one is configured), and every one of them is something the user can act
  // on by typing a different password.
  if (error) return { error: error.message };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  // Straight to their dashboard rather than back to sign-in. updateUser keeps
  // the session alive, so bouncing them to a login form would mean asking for
  // the password they just set while they are already holding a valid session.
  redirect(homeForRole(profile?.role ?? "patient"));
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
