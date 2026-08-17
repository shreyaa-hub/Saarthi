import type { PageStyle } from "@/lib/types/canvas";

const RULE = "#dfd8c9";
const GAP = 32;
const MARGIN_X = 64;
const MARGIN_RULE = "#e6b8b8";

// The page ruling, expressed as CSS gradients rather than an element, so it
// sits behind everything the author places and never becomes selectable,
// draggable, or part of the element list. Returned as a style object shared by
// the authoring canvas and the player, so the printed page, the preview and
// the on-screen activity all show the same ruling.
export function pageStyleBackground(
  pageStyle: PageStyle | undefined,
  background: string,
): React.CSSProperties {
  switch (pageStyle) {
    case "ruled":
      return {
        background,
        backgroundImage: `repeating-linear-gradient(to bottom, transparent 0 ${GAP - 1}px, ${RULE} ${GAP - 1}px ${GAP}px)`,
      };
    // Exercise-book ruling: the same horizontal lines plus a single vertical
    // margin rule. The margin is drawn in a warmer tone, as on real paper, so
    // it reads as a margin rather than as one more line.
    case "ruled-margin":
      return {
        background,
        backgroundImage:
          `linear-gradient(to right, transparent 0 ${MARGIN_X - 1}px, ${MARGIN_RULE} ${MARGIN_X - 1}px ${MARGIN_X}px, transparent ${MARGIN_X}px),` +
          `repeating-linear-gradient(to bottom, transparent 0 ${GAP - 1}px, ${RULE} ${GAP - 1}px ${GAP}px)`,
        backgroundRepeat: "no-repeat, repeat",
      };
    case "grid":
      return {
        background,
        backgroundImage:
          `repeating-linear-gradient(to bottom, transparent 0 ${GAP - 1}px, ${RULE} ${GAP - 1}px ${GAP}px),` +
          `repeating-linear-gradient(to right, transparent 0 ${GAP - 1}px, ${RULE} ${GAP - 1}px ${GAP}px)`,
      };
    case "dotted":
      return {
        background,
        backgroundImage: `radial-gradient(${RULE} 1.2px, transparent 1.2px)`,
        backgroundSize: `${GAP}px ${GAP}px`,
      };
    // "blank" and undefined (every canvas authored before worksheets existed)
    // render exactly as they always did.
    default:
      return { background };
  }
}
