// Shared palette for randomly-assigned template thumbnail accents — kept in
// the "Moss & Clay" family (see globals.css) rather than arbitrary hues.
export const THUMBNAIL_COLORS = [
  "#3b5544", // moss (primary)
  "#a85a39", // clay (accent)
  "#8b5f72", // mauve
  "#b8923f", // ochre
  "#4c7a52", // fern
  "#6b7fa0", // dusty slate
];

export function randomThumbnailColor(): string {
  return THUMBNAIL_COLORS[Math.floor(Math.random() * THUMBNAIL_COLORS.length)];
}
