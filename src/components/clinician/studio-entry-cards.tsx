"use client";

import Link from "next/link";
import { FilePlus2, MonitorSmartphone, Printer, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { StaggerGroup, StaggerItem } from "@/components/motion/stagger-group";

const entries = [
  {
    href: "/clinician/studio/initialize?entry=blank",
    icon: FilePlus2,
    title: "Initialize — Blank",
    body: "Launch now. Choose a medium, then build from a blueprint or from scratch.",
  },
  {
    href: "/clinician/studio/initialize?entry=interactive-shell",
    icon: MonitorSmartphone,
    title: "Interactive Shell",
    body: "Pre-built behavioral logic — skips straight to picking a foundation.",
  },
  {
    href: "/clinician/studio/initialize?entry=printable-forms",
    icon: Printer,
    title: "Printable Forms",
    body: "Static, print-ready activities — skips straight to picking a foundation.",
  },
  {
    href: "/clinician/studio/worksheet-generator",
    icon: FileText,
    title: "Worksheet Creator",
    body: "A printable page with text, lists, shapes, writing lines, page ruling and multiple pages.",
  },
];

export function StudioEntryCards() {
  return (
    <StaggerGroup className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {entries.map((e) => (
        <StaggerItem key={e.href}>
          <Link href={e.href}>
            <Card className="group h-full transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
              <CardContent className="flex flex-col gap-3 pt-6">
                <span className="flex size-10 items-center justify-center rounded-xl bg-secondary text-primary transition-transform group-hover:scale-110">
                  <e.icon className="size-5" />
                </span>
                <div>
                  <p className="font-semibold">{e.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{e.body}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </StaggerItem>
      ))}
    </StaggerGroup>
  );
}
