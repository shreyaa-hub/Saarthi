"use client";

import { createContext, useContext } from "react";

// MessagesSplitPane (the clinician inbox's mobile/desktop split layout)
// keeps the auto-selected conversation's MessageThread mounted at all
// times, only CSS-hiding it (`hidden`, not conditional rendering) on
// mobile when the bare /clinician/messages list route is showing. Mounted
// is not the same as visible — without this context, MessageThread would
// treat "mounted" as "the user is looking at this conversation," which
// would silently mark a mobile user's top conversation read and suppress
// its unread badge even though they'd never actually seen it.
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
