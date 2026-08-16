"use client";

import { useMemo, useState, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  subscribeGuestDraft,
  getGuestDraftRaw,
  getGuestDraftServerSnapshot,
  parseGuestDraft,
  clearGuestDraft,
} from "@/lib/canvas/guest-draft";
import { claimGuestDraft } from "@/lib/actions/templates";

// Offers the worksheet someone built at /try before they had an account.
// Rendered on the clinician Studio and the parent Creator Hub — the two
// places a newly signed-up user lands where a saved worksheet belongs.
//
// Subscribes to the stored draft rather than reading it in an effect: the
// server snapshot is always null (localStorage doesn't exist there), so the
// banner is simply absent from the server HTML and appears after hydration
// without a mismatch.
export function ClaimDraftBanner() {
  const router = useRouter();
  const raw = useSyncExternalStore(
    subscribeGuestDraft,
    getGuestDraftRaw,
    getGuestDraftServerSnapshot,
  );
  const draft = useMemo(() => parseGuestDraft(raw), [raw]);
  const [dismissed, setDismissed] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!draft || dismissed) return null;

  const elementCount = draft.canvas.elements.length;

  const keep = () => {
    startTransition(async () => {
      const { error, templateId, role } = await claimGuestDraft({
        title: draft.title,
        domain: draft.domain,
        canvas: draft.canvas,
      });
      if (error || !templateId) {
        toast.error(error ?? "Could not save the worksheet.");
        return;
      }
      // Only cleared once it is safely stored — a failed claim must leave the
      // draft where it is so the offer can be made again.
      clearGuestDraft();
      toast.success("Saved to your library");
      router.push(role === "parent" ? `/parent/worksheets/${templateId}` : `/clinician/studio/${templateId}`);
    });
  };

  const discard = () => {
    clearGuestDraft();
    setDismissed(true);
  };

  return (
    <Card className="border-primary/40 bg-secondary/40">
      <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Sparkles className="size-5" />
          </span>
          <div>
            <p className="font-medium">
              Keep “{draft.title}”?
            </p>
            <p className="text-sm text-muted-foreground">
              You started this before signing up
              {elementCount > 0 ? ` — ${elementCount} item${elementCount === 1 ? "" : "s"} on the page.` : "."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={keep} disabled={pending}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            Save it to my library
          </Button>
          <Button variant="ghost" size="icon" onClick={discard} aria-label="Discard the draft">
            <X className="size-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
