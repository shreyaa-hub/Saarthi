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

  const { pathname } = request.nextUrl;
  const isClinicianRoute = pathname.startsWith(CLINICIAN_PREFIX);
  const isPatientRoute = pathname.startsWith(PATIENT_PREFIX);
  const isAuthRoute = AUTH_PATHS.some((p) => pathname.startsWith(p));

  if (!user && (isClinicianRoute || isPatientRoute)) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute) {
    const role = user.user_metadata?.role === "clinician" ? "clinician" : "patient";
    const url = request.nextUrl.clone();
    url.pathname = role === "clinician" ? "/clinician" : "/patient";
    return NextResponse.redirect(url);
  }

  if (user && (isClinicianRoute || isPatientRoute)) {
    const role = user.user_metadata?.role === "clinician" ? "clinician" : "patient";
    if (isClinicianRoute && role !== "clinician") {
      const url = request.nextUrl.clone();
      url.pathname = "/patient";
      return NextResponse.redirect(url);
    }
    if (isPatientRoute && role !== "patient") {
      const url = request.nextUrl.clone();
      url.pathname = "/clinician";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
