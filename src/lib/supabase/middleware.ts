import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/types/database";

const CLINICIAN_PREFIX = "/clinician";
const PATIENT_PREFIX = "/patient";
const AUTH_PATHS = ["/sign-in", "/sign-up"];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // Env vars not configured yet — let the request through so the
    // marketing site still renders instead of crashing the whole app.
    return supabaseResponse;
  }

  const { pathname } = request.nextUrl;
  const isClinicianRoute = pathname.startsWith(CLINICIAN_PREFIX);
  const isPatientRoute = pathname.startsWith(PATIENT_PREFIX);
  const isAuthRoute = AUTH_PATHS.some((p) => pathname.startsWith(p));

  try {
    const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user && (isClinicianRoute || isPatientRoute)) {
      const url = request.nextUrl.clone();
      url.pathname = "/sign-in";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }

    if (user && isAuthRoute) {
      // Best-effort only — the JWT's role claim can drift from the
      // profiles table (e.g. an admin edits it directly in Supabase).
      // requireProfile() on the destination page re-checks against the
      // database and is the single source of truth; if this guess is
      // wrong it self-corrects in one hop, it never loops.
      const role = user.user_metadata?.role === "clinician" ? "clinician" : "patient";
      const url = request.nextUrl.clone();
      url.pathname = role === "clinician" ? "/clinician" : "/patient";
      return NextResponse.redirect(url);
    }

    // Deliberately no role-based redirect for /clinician and /patient here.
    // Checking the JWT's role claim against the route AND having
    // requireProfile() separately check the database's role against the
    // route creates two authorities that can disagree (JWT says patient,
    // profiles table says clinician) and bounce the request back and
    // forth forever (ERR_TOO_MANY_REDIRECTS). Proxy only gates
    // "authenticated or not"; requireProfile() owns role routing.

    return supabaseResponse;
  } catch (error) {
    // A proxy crash takes down every route on the site, not just the one
    // that triggered it — never let a Supabase/network hiccup do that.
    // Protected pages still enforce auth themselves via requireProfile(),
    // so failing open here just means they render their own (recoverable)
    // redirect instead of a raw connection failure.
    console.error("proxy: updateSession failed, letting request through", error);
    return supabaseResponse;
  }
}
