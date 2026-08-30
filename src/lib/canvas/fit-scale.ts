// How much to scale a fixed-size canvas to sit inside the space available.
//
// Extracted from the player so the one decision that has any subtlety — when
// the canvas is allowed to grow past its authored size and when it is not — is
// a pure function with a test, rather than arithmetic buried in a resize
// callback that only a real browser at a real size could exercise.
export function fitScale(
  containerWidth: number,
  containerHeight: number,
  canvasWidth: number,
  canvasHeight: number,
  fullscreen: boolean,
): number {
  const pad = fullscreen ? 16 : 32;
  const availableWidth = containerWidth - pad;
  const availableHeight = containerHeight - pad;
  if (availableWidth <= 0 || availableHeight <= 0 || canvasWidth <= 0 || canvasHeight <= 0) {
    return 1;
  }

  const fit = Math.min(availableWidth / canvasWidth, availableHeight / canvasHeight);
  // Windowed: never past 1, so a small activity is not blown up to fill a
  // desktop monitor. Fullscreen: allowed to grow, because filling the screen
  // is the entire point — otherwise a small canvas floats in a sea of empty
  // background, which is the "filler" this fixes.
  const next = fullscreen ? fit : Math.min(1, fit);
  return next > 0 ? next : 1;
}
