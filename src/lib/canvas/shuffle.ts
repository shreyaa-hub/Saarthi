// Fisher-Yates. Never mutates its input, so the same authored pair list
// (Memory Match's element.pairs, say) can be reshuffled on every fresh
// mount without the previous shuffle — or the original authored order —
// leaking into the next one.
export function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
