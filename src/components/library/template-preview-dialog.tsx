"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Loader2, Download, Play, Printer, UserPlus } from "lucide-react";
import { toast } from "sonner";
import type { TemplateCanvas } from "@/lib/types/canvas";
import { importTemplate } from "@/lib/actions/library";
import { CanvasPreview } from "@/components/library/canvas-preview";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type ViewerRole = "clinician" | "parent" | "patient" | null;

export type PreviewDetail = {
  id: string;
  title: string;
  description: string | null;
  domain: string;
  medium: string;
  canvas: TemplateCanvas;
};

// What the library offers differs by who is looking, but the preview itself
// is the same for everyone — including a visitor with no account, who is meant
// to see the real thing and then be asked to join.
//
// Presentational: the canvas is fetched by whoever opens this, on the click
// that opens it, rather than by an effect here. Loading on render would mean
// setting state inside an effect purely to react to a prop change, which is
// the pattern React now warns about — and the click is the real trigger.
export function TemplatePreviewDialog({
  templateId,
  title,
  role,
  detail,
  loading,
  failed,
  open,
  onOpenChange,
}: {
  templateId: string;
  title: string;
  role: ViewerRole;
  detail: PreviewDetail | null;
  loading: boolean;
  failed: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [importing, startImport] = useTransition();

  const isPrint = (detail?.medium ?? "") === "print";

  const handleImport = () => {
    startImport(async () => {
      // On success this redirects into the new copy, so nothing after it runs.
      const res = await importTemplate(templateId);
      if (res?.error) toast.error(res.error);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-hidden">
        <DialogHeader>
          <DialogTitle>{detail?.title ?? title}</DialogTitle>
          <DialogDescription>
            {detail?.description
              ? detail.description
              : role === null
                ? "A preview of what clinicians and families are building on Verbal Coach."
                : "Preview before you use it."}
          </DialogDescription>
        </DialogHeader>

        {detail && (
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline">{detail.domain}</Badge>
            <Badge variant="secondary">{detail.medium}</Badge>
          </div>
        )}

        <div className="flex h-[52vh] items-center justify-center rounded-lg border border-border bg-muted/30">
          {loading && <Loader2 className="size-6 animate-spin text-muted-foreground" />}
          {failed && (
            <p className="px-6 text-center text-sm text-muted-foreground">
              This item could not be loaded. Its author may have unpublished it.
            </p>
          )}
          {detail && !failed && <CanvasPreview canvas={detail.canvas} className="h-full w-full p-2" />}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {/* Signed out — the preview is the pitch, so the call to action
              follows it rather than replacing it. */}
          {role === null && (
            <>
              <p className="mr-auto text-sm text-muted-foreground">
                Create a free account to use this with your own patients or children.
              </p>
              <Button asChild>
                <Link href="/sign-up">
                  <UserPlus className="size-4" /> Sign up to use this
                </Link>
              </Button>
            </>
          )}

          {/* Clinicians and parents get their own editable copy. The original
              is never touched — see importTemplate. */}
          {(role === "clinician" || role === "parent") && (
            <>
              <p className="mr-auto text-sm text-muted-foreground">
                Importing makes your own private copy. Editing it never changes the original.
              </p>
              {/* Trying it before importing is the point of a preview, and a
                  clinician could not do it: the library offered "Try this
                  activity" to patients only, so the one person deciding
                  whether to use an activity was the one who could not play
                  it. Print templates are excluded — there is nothing to play,
                  and the full-size view is the preview. */}
              {role === "clinician" && !isPrint && (
                <Button variant="outline" asChild disabled={!detail}>
                  <Link href={`/clinician/try/${templateId}`}>
                    <Play className="size-4" /> Try it
                  </Link>
                </Button>
              )}
              <Button onClick={handleImport} disabled={importing || !detail}>
                {importing ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                Import to my library
              </Button>
            </>
          )}

          {/* Patients have no library to import into, so the library offers
              them the activity itself. */}
          {role === "patient" && (
            <>
              <p className="mr-auto text-sm text-muted-foreground">
                {isPrint
                  ? "Open it full size to read or print."
                  : "Practice runs are just for you — they are not sent to your clinician."}
              </p>
              <Button asChild disabled={!detail}>
                <Link href={`/library/try/${templateId}`}>
                  {isPrint ? <Printer className="size-4" /> : <Play className="size-4" />}
                  {isPrint ? "View worksheet" : "Try this activity"}
                </Link>
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
