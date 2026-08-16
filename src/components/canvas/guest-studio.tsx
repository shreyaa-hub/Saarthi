"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Sparkles, Stethoscope, Users } from "lucide-react";
import { CanvasEditor } from "@/components/canvas/canvas-editor";
import { EMPTY_WORKSHEET_CANVAS, type TemplateCanvas } from "@/lib/types/canvas";
import { readGuestDraft, writeGuestDraft } from "@/lib/canvas/guest-draft";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// The public "try it" Studio. Renders the real editor — same tools, same
// shortcuts, same properties panel — with the server swapped out for
// localStorage, so a visitor builds something genuine rather than a demo.
// Never resubscribes — this exists only to give useSyncExternalStore a
// server/client split, not to track a changing value.
const NEVER_CHANGES = () => () => {};

export function GuestStudio() {
  const [promptOpen, setPromptOpen] = useState(false);

  // The stored draft only exists in the browser, so the server cannot render
  // the editor with it — doing so hydration-mismatches the entire canvas.
  // This renders a placeholder for the server pass and the first client
  // render, then mounts the real editor once hydrated, at which point the
  // canvas store is built from the restored draft exactly once.
  const hydrated = useSyncExternalStore(
    NEVER_CHANGES,
    () => true,
    () => false,
  );

  const initial = useMemo(() => {
    const draft = hydrated ? readGuestDraft() : null;
    return {
      title: draft?.title ?? "My first worksheet",
      domain: draft?.domain ?? "General",
      canvas: (draft?.canvas ?? EMPTY_WORKSHEET_CANVAS) as TemplateCanvas,
    };
  }, [hydrated]);

  const persist = useCallback(
    (canvas: TemplateCanvas, meta: { title: string; domain: string }) => {
      writeGuestDraft({ canvas, title: meta.title, domain: meta.domain });
    },
    [],
  );

  if (!hydrated) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Opening the Studio…</p>
      </div>
    );
  }

  return (
    <>
      <CanvasEditor
        template={{
          // No row exists yet — this id is never sent anywhere, because guest
          // mode short-circuits every server call before it would be used.
          id: "guest-draft",
          title: initial.title,
          domain: initial.domain,
          medium: "print",
          status: "draft",
          canvas: initial.canvas,
          updated_at: new Date().toISOString(),
        }}
        surface="worksheet"
        backHref="/"
        guest={{ persist, onSignUpPrompt: () => setPromptOpen(true) }}
      />

      <Dialog open={promptOpen} onOpenChange={setPromptOpen}>
        <DialogContent>
          <DialogHeader>
            <div className="mb-1 flex size-10 items-center justify-center rounded-xl bg-secondary text-primary">
              <Sparkles className="size-5" />
            </div>
            <DialogTitle>Create a free account to keep this</DialogTitle>
            <DialogDescription>
              Your worksheet is saved in this browser. Make an account and we&apos;ll move it into
              your library, where you can print it, share it, and send it to someone.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2">
            <Button asChild>
              <Link href="/sign-up?next=claim">
                <Users className="size-4" /> I&apos;m a parent
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/sign-up?next=claim">
                <Stethoscope className="size-4" /> I&apos;m a clinician
              </Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/sign-in?next=claim">I already have an account</Link>
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Nothing is lost if you close this — your work stays in this browser until you save it.
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
