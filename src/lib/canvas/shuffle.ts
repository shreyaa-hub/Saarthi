// Deterministic shuffling for activity content.
//
// Why not Math.random(): these lists are rendered inside Client Components,
// which Next.js still renders on the server first. A random shuffle produces
// one order in the SSR pass and a different one during hydration, and React
// throws "server rendered HTML didn't match the client" and discards the
// tree. Seeding from a stable string makes both passes agree, so the shuffle
// is invisible to hydration while still not being the authored order.
//
// The trade-off worth knowing: an element's order is therefore stable — the
// same for every patient and every attempt — rather than re-randomised each
// time. It solves the problem that actually mattered (content rendered in
// the authored order, which for these activity types IS the answer key), but
// it does not stop a patient who repeats the same activity from recognising
// the layout.

// FNV-1a. Small, fast, and good enough to spread element ids across the seed
// space — this seeds a display shuffle, nothing security-sensitive.
function hashString(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// mulberry32 — a compact seeded PRNG with a well-distributed 32-bit period.
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Fisher-Yates driven by a seeded PRNG, then forced into a *derangement*:
 * for a list of two or more, no element is left in the slot it started in.
 * Never mutates its input, and always returns the same order for the same
 * (items, seed) pair.
 *
 * The derangement is the part that actually matters here. A plain shuffle
 * still leaves fixed points — with four items one lands in its original slot
 * about 63% of the time — and in a drag-to-match activity a fixed point is a
 * right-hand option sitting directly beside the left-hand item it belongs
 * with, which the patient can pair off without reading either. Removing every
 * fixed point removes every freebie.
 */
export function seededShuffle<T>(items: T[], seed: string): T[] {
  const result = [...items];
  const n = result.length;
  if (n < 2) return result;

  const rand = mulberry32(hashString(seed));
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  // Walk out any element still sitting where it began. Each pass swaps one
  // offender with another slot; a swap can create a new fixed point, so this
  // repeats until clean. The guard is a belt-and-braces terminator — a
  // derangement always exists for n >= 2 and this converges in a handful of
  // passes — so it can never spin here on some input nobody anticipated.
  for (let guard = 0; guard < 100; guard++) {
    const stuck = result.findIndex((item, i) => item === items[i]);
    if (stuck === -1) break;
    let partner = Math.floor(rand() * n);
    if (partner === stuck) partner = (stuck + 1) % n;
    [result[stuck], result[partner]] = [result[partner], result[stuck]];
  }

  return result;
}
