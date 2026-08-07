"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
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
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { assignWorksheetToChild } from "@/lib/actions/parent";
import type { ParentChild } from "@/lib/data/parent";

export function AssignToChildDialog({
  templateId,
  templateTitle,
  childList,
  defaultChildId,
  open,
  onOpenChange,
}: {
  templateId: string;
  templateTitle: string;
  childList: ParentChild[];
  defaultChildId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [childId, setChildId] = useState(defaultChildId ?? childList[0]?.childId ?? "");
  const [instructions, setInstructions] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [pending, startTransition] = useTransition();

  const submit = () => {
    if (!childId) {
      toast.error("Pick a child first.");
      return;
    }
    startTransition(async () => {
      const { error } = await assignWorksheetToChild(templateId, childId, { instructions, dueDate });
      if (error) {
        toast.error(error);
        return;
      }
      toast.success("Sent to their missions");
      onOpenChange(false);
      setInstructions("");
      setDueDate("");
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send to your child</DialogTitle>
          <DialogDescription>
            “{templateTitle}” will appear in their missions list, alongside anything their clinician
            has assigned.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Only a real choice when there is more than one child. */}
          {childList.length > 1 && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="assign-child">Child</Label>
              <Select value={childId} onValueChange={setChildId}>
                <SelectTrigger id="assign-child"><SelectValue placeholder="Choose a child" /></SelectTrigger>
                <SelectContent>
                  {childList.map((c) => (
                    <SelectItem key={c.childId} value={c.childId}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="assign-instructions">Instructions (optional)</Label>
            <Textarea
              id="assign-instructions"
              rows={3}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="A note for your child"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="assign-due">Due date (optional)</Label>
            <Input
              id="assign-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <Button onClick={submit} disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            Send it
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
