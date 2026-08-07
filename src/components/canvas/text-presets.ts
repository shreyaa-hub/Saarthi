import type { TextElement } from "@/lib/types/canvas";

// Canva-style "add a heading / subheading / body" shortcuts. Each is just a
// TextElement with different defaults — no new element type, so everything
// that already understands text (the preview, the player, the properties
// panel, scoring's non-interactive path) handles these with no changes.
export type TextPreset = {
  id: string;
  label: string;
  preview: string;
  previewSize: number;
  patch: Partial<TextElement>;
};

export const TEXT_PRESETS: TextPreset[] = [
  {
    id: "heading",
    label: "Add a heading",
    preview: "Heading",
    previewSize: 22,
    patch: { content: "Heading", fontSize: 36, fontWeight: "bold", w: 420, h: 56 },
  },
  {
    id: "subheading",
    label: "Add a subheading",
    preview: "Subheading",
    previewSize: 16,
    patch: { content: "Subheading", fontSize: 24, fontWeight: "medium", w: 380, h: 40 },
  },
  {
    id: "body",
    label: "Add body text",
    preview: "A little bit of body text",
    previewSize: 12,
    patch: { content: "A little bit of body text", fontSize: 16, fontWeight: "normal", w: 320, h: 32 },
  },
];
