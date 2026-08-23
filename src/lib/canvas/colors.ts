// Shared palette for randomly-assigned template thumbnail accents — kept in
// the "Voltage" family (see globals.css) rather than arbitrary hues, so a
// grid of templates reads as one set instead of a colour swatch.
//
// These are literals rather than theme tokens on purpose: the chosen value is
// written into templates.thumbnail_color at creation time and stored, so it
// has to be a real colour and not a var() that means different things in
// light and dark mode. Each is picked to sit legibly on both.
export const THUMBNAIL_COLORS = [
  "#7c3aed", // violet (primary)
  "#0891b2", // cyan (accent)
  "#db2777", // pink
  "#ea580c", // orange
  "#059669", // emerald
  "#4f46e5", // indigo
];

export function randomThumbnailColor(): string {
  return THUMBNAIL_COLORS[Math.floor(Math.random() * THUMBNAIL_COLORS.length)];
}
