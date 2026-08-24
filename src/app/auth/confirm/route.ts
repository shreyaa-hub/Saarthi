import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeRedirect } from "@/lib/auth/redirects";

// Where a link from a Supabase email lands. Its whole job is to turn the
// one-time token in that link into a real session cookie and then get out of
// the way, handing the user to the page that actually does something with it.
//
// It has to be a Route Handler rather than a page: setting a cookie is not
// allowed while a Server Component renders, and a session that cannot be
// written to a cookie is no session at all.
//
// Named to match Supabase's own documented convention, so the next person to
// read their docs alongside this repo finds the file where they expect it.

// `type` arrives in the query string, which means a stranger writes it. Check
// it against the list rather than casting, so a junk value is a redirect to a
// friendly page instead of whatever Supabase does with an unknown OTP type.
// The extra types beyond "recovery" cost nothing and are already correct if
// email confirmation is ever switched on.
const EMAIL_OTP_TYPES = ["recovery", "signup", "invite", "magiclink", "email"] as const;
type EmailOtpType = (typeof EMAIL_OTP_TYPES)[number];

function asEmailOtpType(value: string | null): EmailOtpType | null {
  return EMAIL_OTP_TYPES.includes(value as EmailOtpType) ? (value as EmailOtpType) : null;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = safeRedirect(searchParams.get("next")) ?? "/reset-password";

  const tokenHash = searchParams.get("token_hash");
  const type = asEmailOtpType(searchParams.get("type"));
  const code = searchParams.get("code");

  const supabase = await createClient();

  // Two link shapes can arrive here, and which one you get is decided by an
  // email template in the Supabase dashboard rather than by anything in this
  // repo. Both are handled, because the stock template produces the second
  // and the first has to be opted into.
  //
  //   token_hash — from a template using {{ .TokenHash }}. Stateless: it
  //     verifies from any browser. A reset requested on a laptop still works
  //     when the email is opened on a phone, which is what people actually do.
  //     This is the one to configure.
  //
  //   code — from the stock {{ .ConfirmationURL }}. @supabase/ssr sets
  //     flowType "pkce" (verified in createServerClient.js), so
  //     resetPasswordForEmail stores a code verifier in a cookie and the
  //     exchange below needs that same cookie back. Open the email anywhere
  //     else and there is no verifier, so it fails with "both auth code and
  //     code verifier should be non-empty". It works, but only in the browser
  //     that asked for it.
  let failure: { message: string } | null = null;

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    failure = error;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    failure = error;
  } else {
    // Neither parameter present: someone opened /auth/confirm directly, or an
    // email client mangled the link.
    return NextResponse.redirect(new URL("/forgot-password?error=link", origin));
  }

  if (failure) {
    // The reasons all look the same from the outside — expired, already used,
    // wrong browser — and none of them change what the user should do next,
    // which is ask for another link. The specific cause goes to the server log
    // for whoever has to diagnose it.
    console.error("[auth/confirm] verification failed:", failure.message);
    return NextResponse.redirect(new URL("/forgot-password?error=link", origin));
  }

  // The session cookies were written through cookies() during verification;
  // Next attaches them to this redirect, so the destination page is already
  // authenticated on arrival.
  return NextResponse.redirect(new URL(next, origin));
}
