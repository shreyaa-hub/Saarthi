"use client";

import { createContext, useContext } from "react";

// Fixes a real bug found during the Step 5 final audit: MessagesSplitPane
// (the clinician inbox's mobile/desktop split layout) keeps the
// auto-selected conversation's MessageThread mounted at all times, only
// CSS-hiding it (`hidden`, not conditional rendering) on mobile when the
// bare /clinician/messages list route is showing. Mounted is not the same
// as visible — MessageThread was treating "mounted" as "the user is
// looking at this conversation," which meant a mobile user browsing the
// list had their top conversation silently marked read and its unread
// badge suppressed, even though they'd never actually seen it.
//
// Default true: every OTHER place that renders MessageThread (the patient
// page, and /clinician/messages/[id] for an explicitly opened
// conversation) never wraps it in the Provider below, so this context is
// a no-op for them — unchanged behavior. It only ever becomes relevant
// inside MessagesSplitPane's specific mounted-but-possibly-hidden subtree.
const ConversationVisibilityContext = createContext(true);

export const ConversationVisibilityProvider = ConversationVisibilityContext.Provider;

export function useConversationVisible(): boolean {
  return useContext(ConversationVisibilityContext);
}
