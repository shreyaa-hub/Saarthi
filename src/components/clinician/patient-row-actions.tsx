"use client";

import { useState, useTransition } from "react";
import { MoreHorizontal, Archive, RotateCcw, Copy, Users } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { archivePatient, reactivatePatient } from "@/lib/actions/patients";

export function PatientRowActions({
  id,
  status,
  inviteCode,
  guardianCode,
}: {
  id: string;
  status: string;
  inviteCode: string;
  guardianCode?: string | null;
}) {
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" disabled={busy}>
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {status === "invited" && (
          <DropdownMenuItem
            onSelect={() => {
              navigator.clipboard.writeText(inviteCode);
              toast.success("Invite code copied");
            }}
          >
            <Copy className="size-4" /> Copy invite code
          </DropdownMenuItem>
        )}
        {/* Available at any status, not just "invited": a parent commonly
            asks for access long after the child has set their own account
            up, and unlike the invite code this one is never consumed. */}
        {guardianCode && status !== "archived" && (
          <DropdownMenuItem
            onSelect={() => {
              navigator.clipboard.writeText(guardianCode);
              toast.success("Guardian code copied — share this with a parent, not the patient");
            }}
          >
            <Users className="size-4" /> Copy guardian code
          </DropdownMenuItem>
        )}
        {status === "archived" ? (
          <DropdownMenuItem
            onSelect={() =>
              startTransition(async () => {
                setBusy(true);
                await reactivatePatient(id);
                setBusy(false);
              })
            }
          >
            <RotateCcw className="size-4" /> Reactivate
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            variant="destructive"
            onSelect={() =>
              startTransition(async () => {
                setBusy(true);
                await archivePatient(id);
                setBusy(false);
              })
            }
          >
            <Archive className="size-4" /> Archive
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
