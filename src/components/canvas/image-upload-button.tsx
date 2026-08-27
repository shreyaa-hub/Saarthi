"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, Upload, ImagePlus } from "lucide-react";
import { uploadImageFile, dragCarriesFiles } from "@/lib/canvas/upload-image";
import { Button } from "@/components/ui/button";
import { useEditorMode } from "./editor-mode";
import { cn } from "@/lib/utils";

export function ImageUploadButton({ onUploaded }: { onUploaded: (url: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const { guest } = useEditorMode();

  const handleFile = async (file: File) => {
    setUploading(true);
    const result = await uploadImageFile(file);
    setUploading(false);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    onUploaded(result.url);
  };

  // Uploads go to Supabase Storage under the signed-in user's own path, so
  // there is nothing a signed-out visitor can upload to. Saying so before
  // they pick a file is far better than a spinner that fails afterwards.
  if (guest) {
    return (
      <div className="rounded-lg border border-dashed border-border p-3 text-center">
        <p className="text-xs text-muted-foreground">
          Uploading needs a free account. You can still paste an image address into{" "}
          <span className="font-medium">Image URL</span> below.
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 rounded-lg border border-dashed p-3 text-center transition-colors",
        dragActive ? "border-primary bg-secondary" : "border-border",
      )}
      // Dragging a real OS file over this zone. Gated on dragCarriesFiles so
      // this never lights up for an internal sidebar-element drag passing
      // over it — that drag carries ELEMENT_DND_TYPE, not "Files".
      onDragOver={(e) => {
        if (!dragCarriesFiles(e.dataTransfer)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
        setDragActive(true);
      }}
      onDragLeave={() => setDragActive(false)}
      onDrop={(e) => {
        if (!dragCarriesFiles(e.dataTransfer)) return;
        e.preventDefault();
        setDragActive(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
      }}
    >
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
      <ImagePlus className="size-4 text-muted-foreground" />
      <p className="text-[11px] text-muted-foreground">Drag an image here, or</p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
        {uploading ? "Uploading…" : "Choose a file"}
      </Button>
    </div>
  );
}
