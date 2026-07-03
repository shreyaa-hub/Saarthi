"use client";

import { useActionState } from "react";
import { Loader2, KeyRound } from "lucide-react";
import { claimInviteCode } from "@/lib/actions/patient";
import type { ActionState } from "@/lib/actions/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const initialState: ActionState = { error: null };

export function ClaimInviteCard() {
  const [state, formAction, pending] = useActionState(claimInviteCode, initialState);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-secondary text-primary">
            <KeyRound className="size-5" />
          </span>
          <div>
            <CardTitle>Connect to your clinician</CardTitle>
            <CardDescription>Enter the invite code they gave you to see your activities.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-3 sm:flex-row">
          <Input
            name="invite_code"
            placeholder="e.g. AB12CD3"
            className="uppercase sm:max-w-48"
            required
          />
          <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            Connect
          </Button>
        </form>
        {state.error && <p className="mt-2 text-sm text-destructive">{state.error}</p>}
      </CardContent>
    </Card>
  );
}
