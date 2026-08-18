"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ScrollText, Plus, Trash2, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { addBlueprintRule, removeBlueprintRule } from "@/lib/actions/blueprint-rules";
import type { BlueprintRule } from "@/lib/data/blueprint-rules";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { formatDate } from "@/lib/utils";

// Shared authoring standards, visible to everyone and editable by clinicians.
// `canEdit` is false for parents: they author worksheets and so need to read
// the rules, but the rules are the clinical team's to set.
export function BlueprintRulesDialog({
  rules,
  canEdit,
  loadFailed = false,
}: {
  rules: BlueprintRule[];
  canEdit: boolean;
  loadFailed?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [confirming, setConfirming] = useState<BlueprintRule | null>(null);
  const [pending, startTransition] = useTransition();

  const add = () => {
    startTransition(async () => {
      const { error } = await addBlueprintRule(draft);
      if (error) {
        toast.error(error);
        return;
      }
      setDraft("");
      toast.success("Rule added");
      router.refresh();
    });
  };

  const remove = (rule: BlueprintRule) => {
    startTransition(async () => {
      const { error } = await removeBlueprintRule(rule.id);
      setConfirming(null);
      if (error) {
        toast.error(error);
        return;
      }
      toast.success("Rule removed");
      router.refresh();
    });
  };

  return (
    <>
      {/* Plain buttons driving `open` directly, the same way the command
          palette next door does it — a wide pill on desktop, an icon on a
          phone, so the top bar stays usable at either size. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground sm:flex cursor-pointer"
      >
        <ScrollText className="size-3.5" />
        Blueprint Rules
        <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
          {rules.length}
        </Badge>
      </button>

      <button
        type="button"
        aria-label="Blueprint Rules"
        onClick={() => setOpen(true)}
        className="flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted sm:hidden cursor-pointer"
      >
        <ScrollText className="size-4" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-h-[85vh] max-w-2xl overflow-hidden"
          // The confirmation is portalled out of this subtree, so every click
          // inside it — including "Keep it" — reads as an interaction outside
          // this dialog and would dismiss the list behind it. Backing out of
          // one deletion should leave you exactly where you were.
          onInteractOutside={(e) => {
            const target = e.target as Element | null;
            if (target?.closest?.("[role='alertdialog']")) e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            if (confirming) e.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>Blueprint Rules</DialogTitle>
            <DialogDescription>
              Standards every clinician follows when building activities for patients.
              {canEdit
                ? " Anything you add here applies to the whole team."
                : " Set by the clinical team — these apply to worksheets you make too."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex max-h-[45vh] flex-col gap-2 overflow-y-auto pr-1">
            {rules.length === 0 ? (
              // An empty list and a failed read look identical from here, so
              // they are said differently — the second one is not something
              // adding a rule will fix.
              <div className="flex flex-col gap-1 py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  {loadFailed
                    ? "Couldn't load the rules."
                    : canEdit
                      ? "No rules yet — add the first one below."
                      : "No rules have been set yet."}
                </p>
                {loadFailed && (
                  <p className="text-xs text-muted-foreground">
                    The blueprint_rules table is missing, or not yet visible to
                    the API. Running migration 0006 creates it, seeds the
                    baseline rules, and refreshes the schema cache.
                  </p>
                )}
              </div>
            ) : (
              rules.map((rule, i) => (
                <div
                  key={rule.id}
                  className="flex items-start gap-3 rounded-lg border border-border px-3 py-2.5"
                >
                  <span className="mt-0.5 w-5 shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
                    {i + 1}.
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">{rule.body}</p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                      {rule.isDefault ? (
                        <>
                          <ShieldCheck className="size-3" /> Platform default
                        </>
                      ) : (
                        <>
                          Added by {rule.authorName ?? "a clinician"} · {formatDate(rule.createdAt)}
                        </>
                      )}
                    </p>
                  </div>
                  {/* Platform defaults are the safety floor — they are not one
                      clinician's to retire for everyone, and the database
                      refuses the delete regardless of what the UI offers. */}
                  {canEdit && !rule.isDefault && (
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={pending}
                      onClick={() => setConfirming(rule)}
                      aria-label={`Remove rule ${i + 1}`}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>

          {canEdit && (
            <div className="flex flex-col gap-2 border-t border-border pt-4">
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={2}
                maxLength={500}
                // Deliberately not one of the seeded rules, so it still reads
                // as an example of writing a new one.
                placeholder="e.g. Play every audio clip through to the end before assigning it."
                aria-label="New rule"
              />
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">
                  {draft.trim().length}/500
                </span>
                <Button onClick={add} disabled={pending || !draft.trim()}>
                  {pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                  Add rule
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Removing affects every clinician, so it confirms first — the same
          treatment template deletion already gets. */}
      <AlertDialog open={confirming !== null} onOpenChange={(o) => !o && setConfirming(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this rule for everyone?</AlertDialogTitle>
            <AlertDialogDescription>
              “{confirming?.body}” will no longer appear for any clinician.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirming && remove(confirming)}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
