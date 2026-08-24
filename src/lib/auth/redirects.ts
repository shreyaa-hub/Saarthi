// Shared open-redirect guard.
//
// Lives on its own because two very different callers need the identical rule:
// the sign-in action (honouring ?redirect= from the proxy) and the email-link
// route handler (honouring ?next= from a Supabase template). Both take a path
// from a URL a stranger can write, and both then redirect to it. A second
// copy of this that drifted by one condition would be a real vulnerability in
// whichever copy lost the race, so there is exactly one.
//
// Deliberately dependency-free for the same reason as lib/auth/roles.ts.

/**
 * Narrows an untrusted redirect target to a same-origin absolute path.
 *
 * Returns null for anything else, so callers fall back to a known-good
 * destination rather than sending the user wherever the URL asked:
 *
 *   "/clinician/studio"      -> kept
 *   "https://evil.example"   -> null (absolute URL, different origin)
 *   "//evil.example"         -> null (protocol-relative; a browser reads this
 *                                     as a host, not a path)
 *   "clinician"              -> null (relative; resolves against whatever the
 *                                     current path happens to be)
 */
export function safeRedirect(target?: string | null): string | null {
  if (!target) return null;
  if (!target.startsWith("/") || target.startsWith("//")) return null;
  return target;
}
