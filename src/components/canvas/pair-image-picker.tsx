"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { ImageIcon, Loader2, X } from "lucide-react";
import { uploadImageFile } from "@/lib/canvas/upload-image";
import { cn } from "@/lib/utils";

// A thumbnail-sized photo slot for one side of a drag-to-match pair.
// Deliberately a compact button rather than a full dropzone like
// ImageUploadButton — DragMatchFields renders one of these per side per
// pair, and a pair list commonly runs to half a dozen rows in the
// properties panel's narrow column, so the full dropzone treatment would
// dominate the panel.
//
// No guest gate here, unlike ImageUploadButton: dragMatch only ever renders
// on the "activity" surface (see ELEMENT_LIBRARY in lib/canvas/defaults.ts),
// and every route that reaches the activity surface requires a session —
// /try, the one route a signed-out visitor can open, is hardcoded to the
// "worksheet" surface. uploadImageFile() still checks for a session on its
// own, so if that ever changes this fails with a clear message rather than
// silently, but there's no reachable guest path to cover today.
export function PairImagePicker({
  src,
  onChange,
  label,
}: {
  src?: string;
  onChange: (src: string | undefined) => void;
  label: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    setUploading(true);
    const result = await uploadImageFile(file);
    setUploading(false);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    onChange(result.url);
  };

  return (
    <div className="relative shrink-0">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        title={src ? `Replace ${label} photo` : `Add a ${label} photo`}
        className={cn(
          "flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md border transition-colors",
          src
            ? "border-border"
            : "border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary",
        )}
      >
        {uploading ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" className="size-full object-cover" />
        ) : (
          <ImageIcon className="size-3.5" />
        )}
      </button>
      {src && !uploading && (
        <button
          type="button"
          onClick={() => onChange(undefined)}
          title={`Remove ${label} photo`}
          className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
        >
          <X className="size-2.5" />
        </button>
      )}
    </div>
  );
}
