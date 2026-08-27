// Tokenizing a Word Hunt passage and deciding which tokens are real targets
// happens in exactly one place, used by both scoring.ts (pure, checking a
// submitted attempt against the answer key) and the player (rendering,
// deciding which words are tappable and which are the correct set to
// highlight on review). Two separate implementations of "what counts as a
// target word" could drift — a tokenizer tweak in one and not the other
// would silently change what counts as correct without either side
// noticing, which is exactly the kind of bug that only shows up as a
// patient's genuinely correct answer being marked wrong.

// Splits into alternating word / non-word chunks. Joining the result back
// together reproduces the original passage exactly, so punctuation and
// spacing are never altered — only word tokens become tappable.
export function tokenizeWordHunt(passage: string): string[] {
  return passage.match(/[\p{L}']+|[^\p{L}']+/gu) ?? [];
}

export function isWordToken(token: string): boolean {
  return /^[\p{L}']+$/u.test(token);
}

// Indices (into the tokenized array) of every token that is one of the
// authored target words, matched case-insensitively — a clinician
// shouldn't have to type "Sun" and "sun" as two separate targets to cover
// both a capitalized and a mid-sentence occurrence.
export function targetTokenIndices(tokens: string[], targetWords: string[]): Set<number> {
  const targets = new Set(
    targetWords.map((w) => w.trim().toLowerCase()).filter((w) => w.length > 0),
  );
  const indices = new Set<number>();
  tokens.forEach((token, i) => {
    if (isWordToken(token) && targets.has(token.toLowerCase())) indices.add(i);
  });
  return indices;
}
