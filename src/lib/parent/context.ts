import { requireProfile } from "@/lib/auth/session";
import { getMyChildren, resolveSelectedChild, type ParentChild } from "@/lib/data/parent";
import { readSelectedChildId } from "@/lib/parent/selected-child";

export type ParentContext = Awaited<ReturnType<typeof requireProfile>> & {
  children: ParentChild[];
  child: ParentChild | null;
};

// Every parent screen needs the same three things: the authenticated parent,
// their linked children, and which one is currently selected. Centralised so
// no page can accidentally resolve the selected child differently from the
// selector in the layout that set it.
export async function getParentContext(): Promise<ParentContext> {
  const session = await requireProfile("parent");
  const children = await getMyChildren(session.supabase, session.user.id);
  const child = resolveSelectedChild(children, await readSelectedChildId());
  return { ...session, children, child };
}
