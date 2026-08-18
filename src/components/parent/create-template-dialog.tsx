"use client";

import { useActionState, useState } from "react";
import { Loader2, Plus, MonitorSmartphone, Plug, Printer } from "lucide-react";
import { createParentTemplate } from "@/lib/actions/parent";
import type { ActionState } from "@/lib/actions/auth";
import { TEMPLATE_DOMAINS, type TemplateMedium } from "@/lib/types/canvas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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

// Same three mediums and the same wording the clinician wizard uses. Parents
// author the same kind of thing, so calling it something else here would only
// make the two halves of the product harder to talk about.
const MEDIA: { value: TemplateMedium; label: string; body: string; icon: typeof Printer }[] = [
  {
    value: "interactive",
    label: "Interactive activity",
    body: "On screen — your child taps, types, and drags.",
    icon: MonitorSmartphone,
  },
  {
    value: "hybrid",
    label: "Hybrid activity",
    body: "A mix of on-screen and hands-on practice.",
    icon: Plug,
  },
  {
    value: "print",
    label: "Printable worksheet",
    body: "A page to print out and work through on paper.",
    icon: Printer,
  },
];

export function CreateTemplateDialog({
  defaultMedium = "interactive",
  label,
  variant = "default",
}: {
  defaultMedium?: TemplateMedium;
  label: string;
  variant?: "default" | "outline";
}) {
  const [state, formAction, pending] = useActionState(createParentTemplate, initialState);
  const [medium, setMedium] = useState<TemplateMedium>(defaultMedium);
  const chosen = MEDIA.find((m) => m.value === medium) ?? MEDIA[0];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant={variant}>
          <Plus className="size-4" /> {label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create something for your child</DialogTitle>
          <DialogDescription>
            Opens the same canvas editor clinicians use. You can change any of this later.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tpl-title">Name</Label>
            <Input id="tpl-title" name="title" required placeholder="e.g. Bedtime routine practice" />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tpl-medium">Type</Label>
            <Select
              name="medium"
              value={medium}
              onValueChange={(v) => setMedium(v as TemplateMedium)}
            >
              <SelectTrigger id="tpl-medium"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MEDIA.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <chosen.icon className="size-3.5 shrink-0" />
              {chosen.body}
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tpl-domain">Area</Label>
            <Select name="domain" defaultValue="General">
              <SelectTrigger id="tpl-domain"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TEMPLATE_DOMAINS.map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Public by default — the checkbox is the opt-out, not the opt-in,
              so leaving the form untouched shares it. */}
          <div className="flex items-start gap-2 rounded-lg border border-border p-3">
            <Checkbox id="tpl-private" name="keep_private" className="mt-0.5" />
            <Label htmlFor="tpl-private" className="text-sm font-normal leading-snug">
              Keep this private
              <span className="mt-0.5 block text-xs text-muted-foreground">
                What you make is shared to the public library by default, so other families and
                clinicians can use it. Tick this to keep it to yourself — you can change it any
                time, and either way you can still send it to your own child.
              </span>
            </Label>
          </div>

          {state.error && <p className="text-sm text-destructive">{state.error}</p>}

          <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            Create and open
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
