"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordReset, type ActionState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, MailCheck } from "lucide-react";

const initialState: ActionState = { error: null };

export function ForgotPasswordForm({ linkFailed }: { linkFailed?: boolean }) {
  const [state, formAction, pending] = useActionState(requestPasswordReset, initialState);

  // Once the request is away, the form is replaced rather than left sitting
  // under the confirmation. Leaving it there invites a second submit, which
  // sends a second email, which invalidates the first — so the user ends up
  // clicking a dead link in the message that arrived first.
  if (state.message) {
    return (
      <Card>
        <CardHeader>
          <div className="mb-1 flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <MailCheck className="size-5" />
          </div>
          <CardTitle className="font-display text-2xl">Check your email</CardTitle>
          <CardDescription>{state.message}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            The link is good for one hour and can only be used once.
          </p>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            <Link href="/sign-in" className="-my-2 inline-flex min-h-11 items-center font-medium text-primary hover:underline">
              Back to sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-2xl">Forgot your password?</CardTitle>
        <CardDescription>
          Enter the email you signed up with and we&apos;ll send you a link to set a new one.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {linkFailed && (
          <p className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            That reset link didn&apos;t work — it may have expired, already been used, or been
            opened in a different browser from the one that requested it. Request a fresh one
            below.
          </p>
        )}
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          <Button type="submit" disabled={pending} className="mt-1">
            {pending && <Loader2 className="size-4 animate-spin" />}
            Send reset link
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Remembered it?{" "}
          <Link href="/sign-in" className="-my-2 inline-flex min-h-11 items-center font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
