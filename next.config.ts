import type { NextConfig } from "next";

// IMPORTANT: the Step 5 Realtime implementation (src/lib/realtime/*,
// MessageThread, ConversationList, NotificationBell, both sidebars) was
// verified against this file's current (empty) config, which leaves
// `cacheComponents` at its default (disabled). Enabling
// `cacheComponents: true` switches Next.js from unmounting routes on
// navigation to hiding them with React's <Activity> component, which
// PRESERVES component state (including messages/notifications/unreadCount
// local state) and PAUSES effect-based subscriptions while hidden instead
// of resetting them — see node_modules/next/dist/docs/01-app/02-guides/
// preserving-ui-state.md. The three MessageThread render sites already
// carry an explicit `key={conversationId}` specifically to stay correct
// either way, but ConversationList/NotificationBell/the sidebars do not
// have an equivalent guard — if this flag is ever enabled, re-audit those
// before shipping.
const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
