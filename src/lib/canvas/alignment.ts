// Smart alignment guides: while dragging an element, find the nearest
// matching edge/center among the other elements (and the canvas bounds),
// and snap to it when within a small pixel threshold — the same idea as
// Figma/Canva's "smart guides."

export const SNAP_THRESHOLD = 6;

export type Guide = { axis: "vertical" | "horizontal"; position: number };

type Box = { x: number; y: number; w: number; h: number };

export function computeSnap(
  dragged: Box,
  others: Box[],
  canvasSize: { width: number; height: number },
): { dx: number; dy: number; guides: Guide[] } {
  const edgesX = [dragged.x, dragged.x + dragged.w / 2, dragged.x + dragged.w];
  const edgesY = [dragged.y, dragged.y + dragged.h / 2, dragged.y + dragged.h];

  const refXs = [0, canvasSize.width / 2, canvasSize.width];
  const refYs = [0, canvasSize.height / 2, canvasSize.height];
  for (const o of others) {
    refXs.push(o.x, o.x + o.w / 2, o.x + o.w);
    refYs.push(o.y, o.y + o.h / 2, o.y + o.h);
  }

  let bestDx = 0;
  let bestDxDist = Infinity;
  let guideX: number | null = null;
  for (const edge of edgesX) {
    for (const ref of refXs) {
      const dist = Math.abs(edge - ref);
      if (dist < bestDxDist) {
        bestDxDist = dist;
        bestDx = ref - edge;
        guideX = ref;
      }
    }
  }

  let bestDy = 0;
  let bestDyDist = Infinity;
  let guideY: number | null = null;
  for (const edge of edgesY) {
    for (const ref of refYs) {
      const dist = Math.abs(edge - ref);
      if (dist < bestDyDist) {
        bestDyDist = dist;
        bestDy = ref - edge;
        guideY = ref;
      }
    }
  }

  const guides: Guide[] = [];
  const dx = bestDxDist <= SNAP_THRESHOLD ? bestDx : 0;
  const dy = bestDyDist <= SNAP_THRESHOLD ? bestDy : 0;
  // Show the guide whenever the edge is within the snap threshold — even if
  // it's already exactly aligned (dx === 0), e.g. because grid-snap
  // happened to land on the same position. Only "within threshold" should
  // gate visibility, not "a correction was needed".
  if (bestDxDist <= SNAP_THRESHOLD && guideX !== null) guides.push({ axis: "vertical", position: guideX });
  if (bestDyDist <= SNAP_THRESHOLD && guideY !== null) guides.push({ axis: "horizontal", position: guideY });

  return { dx, dy, guides };
}

export function snapToGridValue(value: number, gridSize: number): number {
  if (gridSize <= 0) return value;
  return Math.round(value / gridSize) * gridSize;
}
