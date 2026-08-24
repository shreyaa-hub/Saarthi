"use client";

import { useActionState } from "react";
import { updatePassword, type ActionState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

const initialState: ActionState = { error: null };

export function ResetPasswordForm({ email }: { email: string | null }) {
  const [state, formAction, pending] = useActionState(updatePassword, initialState);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-2xl">Set a new password</CardTitle>
        <CardDescription>
          {email ? (
            <>
              You&apos;re resetting the password for <span className="font-medium">{email}</span>.
            </>
          ) : (
            "Choose a new password for your account."
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          {/* The email is shown above but deliberately not submitted: the
              session established by the reset link decides whose password
              changes, so a field here would be either ignored or a way to
              aim the change at somebody else. */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">New password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
            <p className="text-xs text-muted-foreground">At least 8 characters.</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirm_password">Confirm new password</Label>
            <Input
              id="confirm_password"
              name="confirm_password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          <Button type="submit" disabled={pending} className="mt-1">
            {pending && <Loader2 className="size-4 animate-spin" />}
            Update password
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
