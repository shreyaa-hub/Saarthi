"use client";

import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

// Screen-only controls above a printable sheet. `print:hidden` takes the
// whole bar out of the printed output, so the paper carries the worksheet and
// nothing about the app that produced it.
//
// window.print() is the whole PDF story: every browser's print dialogue
// offers "Save as PDF" as a destination, so this covers both printing and
// downloading with no PDF library, no server-side rendering step, and no
// second code path that could drift from what the screen shows.
export function PrintBar({
  title,
  subtitle,
  backHref,
  backLabel = "Back",
}: {
  title: string;
  subtitle?: string;
  backHref: string;
  backLabel?: string;
}) {
  return (
    <div className="print:hidden sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-gray-50 px-6 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <Link
          href={backHref}
          className="flex size-9 shrink-0 items-center justify-center rounded-md text-gray-500 hover:bg-gray-200"
          aria-label={backLabel}
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div className="min-w-0">
          <p className="truncate font-semibold text-gray-900">{title}</p>
          <p className="truncate text-xs text-gray-500">
            {subtitle ?? "Choose “Save as PDF” in the print dialogue to download it."}
          </p>
        </div>
      </div>
      <Button onClick={() => window.print()}>
        <Printer className="size-4" /> Print or save as PDF
      </Button>
    </div>
  );
}
