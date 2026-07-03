"use client";

import { useActionState, useEffect, useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createAssignment } from "@/lib/actions/assignments";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Database } from "@/lib/types/database";

type Template = Pick<Database["public"]["Tables"]["templates"]["Row"], "id" | "title" | "domain">;

const initialState: ActionState = { error: null };

export function AssignTemplateDialog({
  patientId,
  clinicianPatientId,
  templates,
}: {
  patientId: string;
  clinicianPatientId: string;
  templates: Template[];
}) {
  const [open, setOpen] = useState(false);
  const [sessionKey, setSessionKey] = useState(0);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setSessionKey((k) => k + 1);
      }}
    >
      <Button onClick={() => setOpen(true)} disabled={templates.length === 0}>
        <Send className="size-4" /> Assign activity
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign an activity</DialogTitle>
          <DialogDescription>
            The current canvas is snapshotted at assignment time, so later template edits won&apos;t
            change work already assigned.
          </DialogDescription>
        </DialogHeader>
        {templates.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            You don&apos;t have any published templates yet. Publish one from the Studio first.
          </p>
        ) : (
          <AssignForm
            key={sessionKey}
            patientId={patientId}
            clinicianPatientId={clinicianPatientId}
            templates={templates}
            onSuccess={() => setOpen(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function AssignForm({
  patientId,
  clinicianPatientId,
  templates,
  onSuccess,
}: {
  patientId: string;
  clinicianPatientId: string;
  templates: Template[];
  onSuccess: () => void;
}) {
  const [state, formAction, pending] = useActionState(createAssignment, initialState);

  useEffect(() => {
    if (state.message === "Assigned") {
      toast.success("Activity assigned");
      onSuccess();
    }
  }, [state.message, onSuccess]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="patient_id" value={patientId} />
      <input type="hidden" name="clinician_patient_id" value={clinicianPatientId} />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="template_id">Template</Label>
        <Select name="template_id" required>
          <SelectTrigger id="template_id"><SelectValue placeholder="Choose a template" /></SelectTrigger>
          <SelectContent>
            {templates.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.title} — {t.domain}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="instructions">Instructions (optional)</Label>
        <Textarea id="instructions" name="instructions" rows={3} placeholder="Notes for the patient" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="due_date">Due date (optional)</Label>
        <Input id="due_date" name="due_date" type="date" />
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending && <Loader2 className="size-4 animate-spin" />}
        Assign
      </Button>
    </form>
  );
}
