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
import { Checkbox } from "@/components/ui/checkbox";
import type { Database } from "@/lib/types/database";

type Template = Pick<Database["public"]["Tables"]["templates"]["Row"], "id" | "title" | "domain">;

const initialState: ActionState = { error: null };

export type AssignablePatient = { patientId: string; name: string };

export function AssignTemplateDialog({
  patientId,
  clinicianPatientId,
  templates,
  caseload,
  trigger,
}: {
  patientId: string;
  clinicianPatientId: string;
  templates: Template[];
  // When given, the dialog offers the whole caseload and the clinician picks
  // who gets it. Omitted on the patient detail page, where the patient is
  // already decided by the page you are standing on.
  caseload?: AssignablePatient[];
  trigger?: React.ReactNode;
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
      {trigger ? (
        <span onClick={() => templates.length > 0 && setOpen(true)}>{trigger}</span>
      ) : (
        <Button onClick={() => setOpen(true)} disabled={templates.length === 0}>
          <Send className="size-4" /> Assign activity
        </Button>
      )}
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
            caseload={caseload}
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
  caseload,
  onSuccess,
}: {
  patientId: string;
  clinicianPatientId: string;
  templates: Template[];
  caseload?: AssignablePatient[];
  onSuccess: () => void;
}) {
  const [state, formAction, pending] = useActionState(createAssignment, initialState);
  const [selected, setSelected] = useState<string[]>(caseload ? [] : [patientId]);
  const [repeats, setRepeats] = useState(1);

  useEffect(() => {
    if (state.message === "Assigned") {
      toast.success(state.detail ?? "Activity assigned");
      onSuccess();
    }
  }, [state.message, state.detail, onSuccess]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {/* One hidden field per selected patient: the action reads them with
          getAll, so one and many are the same code path. */}
      {selected.map((id) => (
        <input key={id} type="hidden" name="patient_id" value={id} />
      ))}
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
      {caseload && (
        <fieldset className="flex flex-col gap-1.5">
          <legend className="text-sm font-medium">
            Patients{selected.length > 0 && ` (${selected.length} selected)`}
          </legend>
          <div className="flex max-h-44 flex-col gap-1 overflow-y-auto rounded-md border border-border p-2">
            {caseload.map((p) => (
              <label key={p.patientId} className="flex min-h-11 items-center gap-2 px-1 text-sm">
                <Checkbox
                  checked={selected.includes(p.patientId)}
                  onCheckedChange={(on) =>
                    setSelected((prev) =>
                      on ? [...prev, p.patientId] : prev.filter((id) => id !== p.patientId),
                    )
                  }
                />
                {p.name}
              </label>
            ))}
          </div>
          <button
            type="button"
            className="w-fit cursor-pointer text-xs text-muted-foreground underline-offset-2 hover:underline"
            onClick={() =>
              setSelected((prev) =>
                prev.length === caseload.length ? [] : caseload.map((p) => p.patientId),
              )
            }
          >
            {selected.length === caseload.length ? "Clear all" : "Select all"}
          </button>
        </fieldset>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="instructions">Instructions (optional)</Label>
        <Textarea id="instructions" name="instructions" rows={3} placeholder="Notes for the patient" />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="due_date">
            Due date {repeats > 1 ? "(first session)" : "(optional)"}
          </Label>
          <Input id="due_date" name="due_date" type="date" required={repeats > 1} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="repeat_count">Repeat</Label>
          <Input
            id="repeat_count"
            name="repeat_count"
            type="number"
            min={1}
            max={30}
            value={repeats}
            onChange={(e) => setRepeats(Math.max(1, Number(e.target.value) || 1))}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="repeat_every_days">Every (days)</Label>
          <Input
            id="repeat_every_days"
            name="repeat_every_days"
            type="number"
            min={1}
            max={30}
            defaultValue={1}
            disabled={repeats <= 1}
          />
        </div>
      </div>
      {repeats > 1 && (
        <p className="-mt-2 text-xs text-muted-foreground">
          Creates {repeats} separate assignments spaced out from the due date, so each day can be
          completed and marked on its own.
        </p>
      )}
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending || selected.length === 0}>
        {pending && <Loader2 className="size-4 animate-spin" />}
        Assign
      </Button>
    </form>
  );
}
