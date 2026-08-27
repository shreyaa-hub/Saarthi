import type { CSSProperties } from "react";
import type { InteractiveAppearance } from "@/lib/types/canvas";
import { APPEARANCE_DEFAULTS, MC_DEFAULT_COLUMNS } from "@/lib/types/canvas";

// Turns an element's optional appearance fields into inline styles, used
// identically by the player and the editor's static preview so what a
// clinician sees while authoring is what the patient gets.
//
// Every field is optional and an unset one contributes nothing to the style
// object rather than a default literal — that matters because the existing
// Tailwind classes on these components already supply theme-aware colors.
// Emitting an explicit `color` when the author never chose one would
// override the theme token and break dark mode; omitting the property lets
// the class keep winning.

export function textStyle(a: InteractiveAppearance): CSSProperties {
  return {
    fontSize: a.fontSize ?? APPEARANCE_DEFAULTS.fontSize,
    ...(a.textColor ? { color: a.textColor } : {}),
  };
}

// For the card/chip surfaces themselves. Only a background — the border
// stays on its class so selection and correct/wrong states can still recolor
// it without fighting an inline style.
export function cardStyle(a: InteractiveAppearance): CSSProperties {
  return a.cardColor ? { backgroundColor: a.cardColor } : {};
}

export function imagePx(a: InteractiveAppearance): number {
  return a.imageSize ?? APPEARANCE_DEFAULTS.imageSize;
}

// Embedded thumbnails were previously a hardcoded Tailwind `size-6` (24px),
// which is what made photos in a match pair or memory card look tiny.
//
// imageSize is the height; the width comes from the shape. Landscape is the
// default because photographs are landscape — a square box with object-cover
// throws away the left and right thirds of one, which is exactly where the
// thing being named usually is.
export function imageStyle(a: InteractiveAppearance): CSSProperties {
  const px = imagePx(a);
  const shape = a.imageShape ?? APPEARANCE_DEFAULTS.imageShape;
  return { width: shape === "wide" ? Math.round((px * 4) / 3) : px, height: px };
}

// Columns for a picture-choice question. Never fewer than one column and
// never more columns than there are answers, so three options asked to lay
// out in four columns fill the row instead of leaving a hole in it.
export function mcGridStyle(el: {
  options: unknown[];
  columns?: number;
}): CSSProperties {
  const wanted = el.columns ?? MC_DEFAULT_COLUMNS;
  const cols = Math.max(1, Math.min(wanted, el.options.length || 1));
  return { gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` };
}

// The picture on one answer. In a list it is a thumbnail beside the words, at
// whatever size the author set. In a picture-choice grid the picture IS the
// answer, so it fills the card's width and only its height is set — a fixed
// square in a card that stretches to fill its column would leave the answers
// floating in a lot of white space, and the patient is meant to be pointing
// at pictures, not at cards.
export function optionPictureStyle(a: InteractiveAppearance, grid: boolean): CSSProperties {
  return grid ? { width: "100%", height: imagePx(a) } : imageStyle(a);
}
