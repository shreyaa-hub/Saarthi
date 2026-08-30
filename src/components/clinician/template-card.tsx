"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { MoreHorizontal, Copy, Trash2, LayoutTemplate, Globe2, Play, ImageUp, ImageOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { duplicateTemplate, deleteTemplate, restoreTemplate, setTemplateThumbnail } from "@/lib/actions/templates";
import { setTemplatePublic } from "@/lib/actions/library";
import { uploadImageFile } from "@/lib/canvas/upload-image";
import { formatDate } from "@/lib/utils";
import type { Database } from "@/lib/types/database";

type Template = Database["public"]["Tables"]["templates"]["Row"];

const statusVariant: Record<string, "success" | "secondary" | "outline"> = {
  published: "success",
  draft: "secondary",
  archived: "outline",
};

export function TemplateCard({ template }: { template: Template }) {
  const [, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPublic, setIsPublic] = useState(template.is_public);
  // Reflected locally so the card updates the instant the upload finishes,
  // rather than waiting for a route revalidation to bring the new URL back.
  const [thumbnailUrl, setThumbnailUrl] = useState(template.thumbnail_url);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onPickThumbnail = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Clear the input value so choosing the same file twice still fires
    // onChange the second time.
    e.target.value = "";
    if (!file) return;

    setUploading(true);
    const result = await uploadImageFile(file);
    if ("error" in result) {
      setUploading(false);
      toast.error(result.error);
      return;
    }
    const { error } = await setTemplateThumbnail(template.id, result.url);
    setUploading(false);
    if (error) {
      toast.error(error);
      return;
    }
    setThumbnailUrl(result.url);
    toast.success("Thumbnail updated");
  };

  const removeThumbnail = () => {
    startTransition(async () => {
      const { error } = await setTemplateThumbnail(template.id, null);
      if (error) toast.error(error);
      else {
        setThumbnailUrl(null);
        toast.success("Thumbnail removed");
      }
    });
  };

  const toggleShare = () => {
    const next = !isPublic;
    setIsPublic(next);
    startTransition(async () => {
      const { error } = await setTemplatePublic(template.id, next);
      if (error) {
        toast.error(error);
        setIsPublic(!next);
      } else {
        toast.success(next ? "Shared to the Global Library" : "Removed from the Global Library");
      }
    });
  };

  const handleDelete = () => {
    setConfirmOpen(false);
    startTransition(async () => {
      const { error } = await deleteTemplate(template.id);
      if (error) {
        toast.error(error);
        return;
      }
      toast("Template moved to trash", {
        action: {
          label: "Undo",
          onClick: () => {
            startTransition(async () => {
              const res = await restoreTemplate(template.id);
              if (res.error) toast.error(res.error);
              else toast.success("Restored");
            });
          },
        },
      });
    });
  };

  return (
    <Card className="group relative overflow-hidden transition-all hover:border-primary/40 hover:shadow-md">
      {/* The uploaded thumbnail if there is one, otherwise the coloured-tile
          placeholder the card has always shown. */}
      {thumbnailUrl ? (
        <div className="h-28 overflow-hidden bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={thumbnailUrl}
            alt=""
            className="size-full object-cover transition-transform group-hover:scale-105"
          />
        </div>
      ) : (
        <div
          className="flex h-28 items-center justify-center transition-colors"
          style={{ backgroundColor: `${template.thumbnail_color}22` }}
        >
          <LayoutTemplate
            className="size-8 transition-transform group-hover:scale-110"
            style={{ color: template.thumbnail_color ?? undefined }}
          />
        </div>
      )}

      {/* Hidden file input the menu item triggers. Outside the card's Link
          overlay so its own click is not swallowed. */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onPickThumbnail}
      />
      {uploading && (
        <div className="absolute inset-x-0 top-0 flex h-28 items-center justify-center bg-background/70">
          <Loader2 className="size-5 animate-spin text-primary" />
        </div>
      )}
      <CardContent className="flex items-start justify-between gap-2 pt-4">
        <div className="min-w-0">
          <Link
            href={`/clinician/studio/${template.id}`}
            className="truncate font-medium after:absolute after:inset-0 after:content-['']"
          >
            {template.title}
          </Link>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <Badge variant={statusVariant[template.status]}>{template.status}</Badge>
            <Badge variant="outline">{template.domain}</Badge>
            {isPublic && (
              <Badge variant="secondary" className="gap-1">
                <Globe2 className="size-3" /> Library
              </Badge>
            )}
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">Updated {formatDate(template.updated_at)}</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative z-10 shrink-0">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {/* First in the menu: trying the activity is what you do before
                assigning it, and it was the one thing you could not do. */}
            <DropdownMenuItem asChild>
              <Link href={`/clinician/try/${template.id}`}>
                <Play className="size-4" /> Try it
              </Link>
            </DropdownMenuItem>
            {/* onSelect fires before the menu unmounts; opening the file
                picker from inside it is fine because the picker is a separate
                element, but the default close is prevented so the click that
                lands on the dialog is not treated as a menu dismissal. */}
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                fileInputRef.current?.click();
              }}
            >
              <ImageUp className="size-4" /> {thumbnailUrl ? "Change thumbnail" : "Upload thumbnail"}
            </DropdownMenuItem>
            {thumbnailUrl && (
              <DropdownMenuItem onSelect={removeThumbnail}>
                <ImageOff className="size-4" /> Remove thumbnail
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onSelect={() =>
                startTransition(async () => {
                  const { error } = await duplicateTemplate(template.id);
                  if (error) toast.error(error);
                  else toast.success("Template duplicated");
                })
              }
            >
              <Copy className="size-4" /> Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={toggleShare}>
              <Globe2 className="size-4" /> {isPublic ? "Remove from Library" : "Share to Library"}
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => setConfirmOpen(true)}
            >
              <Trash2 className="size-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardContent>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move &ldquo;{template.title}&rdquo; to trash?</AlertDialogTitle>
            <AlertDialogDescription>
              It&apos;ll be moved to Trash and can be restored later, or permanently deleted from there.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-white hover:bg-destructive/90">
              Move to trash
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
