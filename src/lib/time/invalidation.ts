// Shared "please recompute your timestamp" signal, module-level singleton
// pub/sub — mirrors the pattern in realtime/messaging-dispatcher.ts
// (createTopic), deliberately not React state, so emitting can never by
// itself cause a re-render of anything that hasn't subscribed.
//
// Fires in exactly two cases, both coarse (at most a couple of times a
// day per tab, never a polling interval):
//  - once per local-midnight crossing, so a live label showing today's
//    clock time (or a date separator showing "Today") correctly flips to
//    "Yesterday" the next time it's evaluated, even with no new message
//    arriving to force a re-render;
//  - once whenever the tab regains visibility, so a backgrounded tab
//    (where a scheduled setTimeout may have been throttled or delayed by
//    the browser) catches up immediately on refocus rather than showing a
//    stale label until its own timer eventually fires.
//
// Both are self-correcting by construction: every consumer recomputes its
// label from the real current time whenever this fires, so an arbitrarily
// late or delayed firing (e.g. a laptop closed across several midnights)
// still lands on the correct answer the moment it does fire — there's no
// need to "catch up" through each missed day individually.

type Listener = () => void;

const listeners = new Set<Listener>();
let midnightTimer: ReturnType<typeof setTimeout> | null = null;
let initialized = false;

function msUntilNextLocalMidnight(now: Date): number {
  // +5s safety margin past midnight — avoids a timer firing a few ms
  // early (due to setTimeout's documented minimum-delay imprecision) and
  // recomputing while still, by a hair, "yesterday" relative to itself.
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5);
  return next.getTime() - now.getTime();
}

function notifyAll() {
  for (const listener of Array.from(listeners)) listener();
}

function scheduleMidnightTick() {
  if (midnightTimer) clearTimeout(midnightTimer);
  midnightTimer = setTimeout(() => {
    notifyAll();
    scheduleMidnightTick();
  }, msUntilNextLocalMidnight(new Date()));
}

function handleVisibilityChange() {
  if (document.visibilityState === "visible") notifyAll();
}

function ensureInitialized() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  scheduleMidnightTick();
  document.addEventListener("visibilitychange", handleVisibilityChange);
}

export function subscribeToTimeInvalidation(listener: Listener): () => void {
  ensureInitialized();
  listeners.add(listener);
  return () => listeners.delete(listener);
}
