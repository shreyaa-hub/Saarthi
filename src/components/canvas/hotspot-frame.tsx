"use client";

import { useState, type ReactNode } from "react";
import { ImageIcon } from "lucide-react";
import type { ImageHotspotsElement } from "@/lib/types/canvas";

// The picture box for a "find in picture" element, and the coordinate space
// its targets live in. Shared by the player, the editor preview and the
// drag-to-place overlay so all three agree — targets are stored as
// percentages, and a percentage only means something against an agreed box.
//
// The subtlety that makes this component necessary: when the picture is
// fitted inside, the visible picture is smaller than the element, so
// positioning targets against the element puts them beside the picture rather
// than on it. The frame therefore has to be exactly the rendered picture.
//
// Getting that box from CSS alone does not work: max-height on a shrink-wrap
// wrapper does not reliably constrain a tall image, which left a portrait
// photo overflowing its element and every target measurably off. So the
// image's real aspect ratio is read on load and applied to the frame, which
// then sizes itself to fit and lets the image fill it exactly. Deterministic,
// and the image's own dimensions are the only source of truth for its shape.
//
// setState here is in an onLoad event handler, not an effect, so it does not
// run afoul of this repo's set-state-in-effect rule.

// Used when the picture cannot be loaded at all, so a clinician can still see
// and drag their targets rather than being left with an empty frame.
const FALLBACK_RATIO = 4 / 3;

export function HotspotFrame({
  element,
  children,
  emptyHint,
}: {
  element: ImageHotspotsElement;
  children?: ReactNode;
  emptyHint?: ReactNode;
}) {
  const fit = element.fit ?? "contain";
  const [ratio, setRatio] = useState<number | null>(null);

  if (!element.src) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-1 rounded border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
        <ImageIcon className="size-5" />
        {emptyHint ?? "No picture set yet"}
      </div>
    );
  }

  // Fill and stretch already cover the element's whole box, so the box itself
  // is the coordinate space and no measuring is needed.
  if (fit !== "contain") {
    return (
      <div className="relative min-h-0 flex-1 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={element.src}
          alt={element.alt}
          className="size-full"
          style={{ objectFit: fit === "cover" ? "cover" : "fill" }}
        />
        {children}
      </div>
    );
  }

  return (
    // container-type: size turns this box into the reference for the cqw/cqh
    // units below, which is what lets the frame be sized against it in pure
    // CSS with no measuring.
    <div className="relative min-h-0 flex-1 overflow-hidden" style={{ containerType: "size" }}>
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={
          ratio
            ? {
                // Exactly "fit inside", computed rather than approximated:
                // take the container's full width, or the width implied by
                // its full height at this aspect ratio, whichever is smaller.
                // aspect-ratio then derives the height, so the frame is the
                // rendered picture — undistorted and pixel-exact.
                //
                // Setting width:100% with a max-height instead does NOT work:
                // both axes end up definite, the ratio is ignored, and the
                // image stretches.
                width: `min(100cqw, calc(100cqh * ${ratio}))`,
                aspectRatio: String(ratio),
              }
            : { maxWidth: "100%", maxHeight: "100%" }
        }
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={element.src}
          alt={element.alt}
          className={ratio ? "absolute inset-0 size-full" : "block max-h-full max-w-full"}
          // Both paths are needed. onLoad covers an image still downloading;
          // the ref covers one that finished before React attached the
          // handler, which is every already-cached image and every data: URI
          // — for those onLoad never fires at all and the frame would wait
          // forever for a ratio it already has.
          ref={(node) => {
            if (ratio !== null || !node?.complete) return;
            setRatio(node.naturalHeight > 0 ? node.naturalWidth / node.naturalHeight : FALLBACK_RATIO);
          }}
          onLoad={(e) => {
            const { naturalWidth, naturalHeight } = e.currentTarget;
            setRatio(naturalHeight > 0 ? naturalWidth / naturalHeight : FALLBACK_RATIO);
          }}
          onError={() => setRatio(FALLBACK_RATIO)}
        />
        {/* Targets wait for the real ratio. A target drawn before the frame
            knows its own shape would sit in the wrong place and, worse, be
            draggable there — so the clinician would place it against
            geometry that is about to change under them. */}
        {ratio !== null && children}
      </div>
    </div>
  );
}
