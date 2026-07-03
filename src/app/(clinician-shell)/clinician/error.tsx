"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function ClinicianErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <AlertTriangle className="size-7" />
        </span>
        <div>
          <h2 className="text-lg font-semibold">Couldn't load this page</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Something went wrong fetching your data. This is usually temporary.
          </p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => reset()}>Try again</Button>
          <Button variant="outline" asChild>
            <Link href="/clinician">Back to dashboard</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
