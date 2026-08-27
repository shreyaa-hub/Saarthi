import { nanoid } from "nanoid";
import { createClient } from "@/lib/supabase/client";

// Shared by every place an image file can enter the canvas: the properties
// panel's Upload button, its drag-and-drop zone, and dropping a file
// straight onto the canvas surface. One upload path means the bucket, the
// size limit, and the per-user storage prefix can only ever be defined once
// — a second copy of this that drifted (a different MAX_BYTES, say) would be
// a real inconsistency, not just duplication.

const BUCKET = "template-assets";
const MAX_BYTES = 5 * 1024 * 1024;

export type UploadResult = { url: string } | { error: string };

export async function uploadImageFile(file: File): Promise<UploadResult> {
  if (!file.type.startsWith("image/")) {
    return { error: "Please choose an image file." };
  }
  if (file.size > MAX_BYTES) {
    return { error: "Images must be under 5MB." };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in to upload images." };
  }

  const ext = file.name.split(".").pop() ?? "png";
  const path = `${user.id}/${nanoid(10)}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });

  if (error) {
    return { error: `Upload failed: ${error.message}` };
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { url: data.publicUrl };
}

// True for a drag carrying at least one OS file — checked against
// dataTransfer.types during dragover/dragenter, since the actual `files`
// list is only populated by the browser once the drop itself fires. Takes
// the DataTransfer directly (not a React.DragEvent) so this file has no
// reason to import React — it's called from several different elements'
// drag handlers, each already holding its own event.
export function dragCarriesFiles(dataTransfer: DataTransfer): boolean {
  return Array.from(dataTransfer.types).includes("Files");
}
