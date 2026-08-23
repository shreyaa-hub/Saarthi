import { cookies } from "next/headers";

// Which child the parent is currently viewing, held in a cookie rather than
// a query string so the selection survives navigation between Missions,
// Progress, Calendar and Finances without every link having to carry it.
// The value is only ever a hint: resolveSelectedChild() validates it against
// the parent's own linked children on each read, so a stale or hand-edited
// cookie degrades to "first child" instead of showing nothing.
export const SELECTED_CHILD_COOKIE = "verbalcoach-child";

export async function readSelectedChildId(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(SELECTED_CHILD_COOKIE)?.value;
}
