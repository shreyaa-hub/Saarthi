"use client";

import { useActionState, useState } from "react";
import { Plus, Loader2, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { invitePatient } from "@/lib/actions/patients";
import type { ActionState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const initialState: ActionState = { error: null };
const CODE_RE = /^[A-Z0-9]{5,10}$/;

export function InvitePatientDialog() {
  const [open, setOpen] = useState(false);
  // Remounting the form on each open (via key) gives a fresh useActionState
  // instead of reaching for an effect to reset stale state on close.
  const [sessionKey, setSessionKey] = useState(0);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setSessionKey((k) => k + 1);
      }}
    >
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" /> Add patient
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite a patient</DialogTitle>
          <DialogDescription>
            Generates an invite code. Share it with your patient — they enter it at sign-up (or
            later from their dashboard) to link their account to your caseload.
          </DialogDescription>
        </DialogHeader>
        <InviteForm key={sessionKey} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function InviteForm({ onDone }: { onDone: () => void }) {
  const [state, formAction, pending] = useActionState(invitePatient, initialState);
  const [copied, setCopied] = useState(false);
  const generatedCode = state.message && CODE_RE.test(state.message) ? state.message : null;

  if (generatedCode) {
    return (
      <div className="flex flex-col items-center gap-3 py-4">
        <p className="text-sm text-muted-foreground">Invite code</p>
        <div className="flex items-center gap-2">
          <span className="rounded-lg border border-dashed border-primary bg-secondary px-5 py-2 text-2xl font-bold tracking-widest text-primary">
            {generatedCode}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => {
              navigator.clipboard.writeText(generatedCode);
              setCopied(true);
              toast.success("Invite code copied");
            }}
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          </Button>
        </div>
        <Button className="mt-2" onClick={onDone}>
          Done
        </Button>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="display_name">Patient name</Label>
        <Input id="display_name" name="display_name" required placeholder="e.g. Ava R." />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea id="notes" name="notes" rows={3} placeholder="Internal notes about this patient" />
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending && <Loader2 className="size-4 animate-spin" />}
        Generate invite code
      </Button>
    </form>
  );
}
