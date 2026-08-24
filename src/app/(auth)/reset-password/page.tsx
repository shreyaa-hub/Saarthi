import Link from "next/link";
import { KeyRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // No session means the reset link was never verified — a bookmark, a link
  // that expired between the email arriving and being opened, or a direct
  // visit. Rendered as an explanation rather than a redirect: bouncing to
  // /forgot-password would leave the person wondering what just happened.
  if (!user) {
    return (
      <Card>
        <CardHeader>
          <div className="mb-1 flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <KeyRound className="size-5" />
          </div>
          <CardTitle className="font-display text-2xl">This link isn&apos;t valid</CardTitle>
          <CardDescription>
            Reset links last one hour and work once. This one has expired, has already been used,
            or was opened in a different browser from the one that requested it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href="/forgot-password">Request a new link</Link>
          </Button>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            <Link href="/sign-in" className="font-medium text-primary hover:underline">
              Back to sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    );
  }

  return <ResetPasswordForm email={user.email ?? null} />;
}
