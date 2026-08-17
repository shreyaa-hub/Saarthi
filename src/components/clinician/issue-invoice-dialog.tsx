"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { issueInvoice } from "@/lib/actions/billing";
import type { ActionState } from "@/lib/actions/auth";
import type { BillableParent } from "@/lib/data/clinician";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const initialState: ActionState = { error: null };

export function IssueInvoiceDialog({ parents }: { parents: BillableParent[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(parents[0] ? keyFor(parents[0]) : "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // A manual submit rather than useActionState, so success and failure are
  // handled where they happen: the dialog closes only when the insert really
  // succeeded, and a rejection (RLS refusing a parent who isn't yours, a bad
  // amount) leaves it open with the reason on screen.
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await issueInvoice(initialState, formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      setError(null);
      setOpen(false);
      toast.success(result.message ?? "Statement issued");
      router.refresh();
    });
  };

  const chosen = parents.find((p) => keyFor(p) === selected);

  if (parents.length === 0) {
    return (
      <Button disabled title="No guardians are linked to your patients yet">
        <Plus className="size-4" /> Issue a statement
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" /> Issue a statement
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Issue a statement</DialogTitle>
          <DialogDescription>
            This records what is owed and shows it in the parent&apos;s Finances tab. No payment is
            taken — mark it paid here once you&apos;ve been paid.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <input type="hidden" name="parent_id" value={chosen?.parentId ?? ""} />
          <input type="hidden" name="child_id" value={chosen?.childId ?? ""} />

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="inv-parent">Bill to</Label>
            <Select value={selected} onValueChange={setSelected}>
              <SelectTrigger id="inv-parent"><SelectValue placeholder="Choose a guardian" /></SelectTrigger>
              <SelectContent>
                {parents.map((p) => (
                  <SelectItem key={keyFor(p)} value={keyFor(p)}>
                    {p.parentName} — for {p.childName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="inv-ref">Reference</Label>
              <Input id="inv-ref" name="reference" required placeholder="e.g. INV-2026-04" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="inv-amount">Amount (₹)</Label>
              <Input id="inv-amount" name="amount" required inputMode="decimal" placeholder="1200" />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="inv-desc">Description (optional)</Label>
            <Textarea id="inv-desc" name="description" rows={2} placeholder="e.g. 4 sessions in April" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="inv-from">Period from (optional)</Label>
              <Input id="inv-from" name="period_start" type="date" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="inv-to">Period to (optional)</Label>
              <Input id="inv-to" name="period_end" type="date" />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="inv-due">Due date (optional)</Label>
            <Input id="inv-due" name="due_date" type="date" />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            Issue it
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// A guardian may guard more than one of this clinician's patients, so the
// pair — not the parent alone — identifies which relationship is being billed.
function keyFor(p: BillableParent) {
  return `${p.parentId}:${p.childId}`;
}
