import type { CSSProperties } from "react";
import type { InteractiveAppearance } from "@/lib/types/canvas";
import { APPEARANCE_DEFAULTS } from "@/lib/types/canvas";

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
export function imageStyle(a: InteractiveAppearance): CSSProperties {
  const px = imagePx(a);
  return { width: px, height: px };
}
