"use client";

import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

// Screen-only controls — `print:hidden` removes this bar entirely from the
// printed/exported output, since a document shouldn't contain navigation
// chrome about itself. window.print() also covers "Save as PDF": every
// major browser's print dialog offers a PDF destination, so a single
// action serves both the print and export cases the product decision
// asked for.
export function ReportPrintBar({ backHref }: { backHref: string }) {
  return (
    <div className="print:hidden sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-gray-50 px-6 py-3">
      <Button variant="ghost" asChild>
        <Link href={backHref}>
          <ArrowLeft className="size-4" /> Back to patient
        </Link>
      </Button>
      <Button onClick={() => window.print()}>
        <Printer className="size-4" /> Print / Save as PDF
      </Button>
    </div>
  );
}
