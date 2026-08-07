"use client";

import { useActionState } from "react";
import { Loader2, Plus } from "lucide-react";
import { createParentWorksheet } from "@/lib/actions/parent";
import type { ActionState } from "@/lib/actions/auth";
import { TEMPLATE_DOMAINS } from "@/lib/types/canvas";
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

export function CreateWorksheetDialog() {
  const [state, formAction, pending] = useActionState(createParentWorksheet, initialState);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" /> Create a worksheet
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a worksheet</DialogTitle>
          <DialogDescription>
            Opens a printable page you can lay out with text, lists, shapes and writing lines.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ws-title">Name</Label>
            <Input id="ws-title" name="title" required placeholder="e.g. Bedtime routine practice" />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ws-domain">Area</Label>
            <Select name="domain" defaultValue="General">
              <SelectTrigger id="ws-domain"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TEMPLATE_DOMAINS.map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Public by default — the checkbox is the opt-out, not the opt-in,
              so leaving the form untouched shares the worksheet. */}
          <div className="flex items-start gap-2 rounded-lg border border-border p-3">
            <Checkbox id="ws-private" name="keep_private" className="mt-0.5" />
            <Label htmlFor="ws-private" className="text-sm font-normal leading-snug">
              Keep this private
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Worksheets are shared to the public library by default so other families and
                clinicians can use them. Tick this to keep it to yourself.
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
