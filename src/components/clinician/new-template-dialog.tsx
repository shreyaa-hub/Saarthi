"use client";

import { useActionState, useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { createTemplate } from "@/lib/actions/templates";
import type { ActionState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TEMPLATE_DOMAINS, TEMPLATE_MEDIUMS } from "@/lib/types/canvas";

const initialState: ActionState = { error: null };

export function NewTemplateDialog() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createTemplate, initialState);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" /> New template
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New template</DialogTitle>
          <DialogDescription>
            Start with a title and a domain — you can change everything, including the canvas
            size and every element, once you&apos;re inside the Studio.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" required placeholder="e.g. Feelings Check-in" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="domain">Domain</Label>
              <Select name="domain" defaultValue="General">
                <SelectTrigger id="domain"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TEMPLATE_DOMAINS.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="medium">Medium</Label>
              <Select name="medium" defaultValue="interactive">
                <SelectTrigger id="medium"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TEMPLATE_MEDIUMS.map((m) => (
                    <SelectItem key={m} value={m} className="capitalize">{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            Create &amp; open canvas
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
