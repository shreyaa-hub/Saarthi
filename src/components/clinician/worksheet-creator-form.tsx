"use client";

import { useActionState } from "react";
import { Loader2, LayoutTemplate, Type, Shapes, List, Baseline, Palette, Files } from "lucide-react";
import { createClinicianWorksheet } from "@/lib/actions/templates";
import { TEMPLATE_DOMAINS } from "@/lib/types/canvas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const initialState = { error: null as string | null };

const TOOLS = [
  { icon: Type, label: "Text", body: "Bold, italic, underline, size, colour and alignment." },
  { icon: List, label: "Bullets & numbers", body: "Switch a list between bulleted and numbered." },
  { icon: Shapes, label: "Shapes", body: "Rectangles, circles and stars, in any fill and border colour." },
  { icon: Baseline, label: "Writing lines", body: "Ruled practice lines, with an optional handwriting midline." },
  { icon: Palette, label: "Page ruling", body: "Blank, ruled with or without a margin, grid or dotted." },
  { icon: Files, label: "Multiple pages", body: "Add as many pages as the worksheet needs." },
];

// Replaces the old AI-drafting form. Creating the worksheet up front rather
// than asking a model for one means this works with no API key configured and
// nothing to fail — the canvas is the product, not the prompt.
export function WorksheetCreatorForm() {
  const [state, formAction, pending] = useActionState(createClinicianWorksheet, initialState);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h2 className="font-display text-2xl font-semibold">New worksheet</h2>
        <p className="text-sm text-muted-foreground">
          Name it, and the worksheet canvas opens with print-ready tools.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form action={formAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ws-title">Worksheet name</Label>
              <Input id="ws-title" name="title" required placeholder="e.g. Bedtime routine practice" />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ws-domain">Domain</Label>
              <Select name="domain" defaultValue="General">
                <SelectTrigger id="ws-domain"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TEMPLATE_DOMAINS.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {state.error && <p className="text-sm text-destructive">{state.error}</p>}

            <Button type="submit" disabled={pending} className="self-start">
              {pending ? <Loader2 className="size-4 animate-spin" /> : <LayoutTemplate className="size-4" />}
              Open the canvas
            </Button>
          </form>
        </CardContent>
      </Card>

      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          What you get on the canvas
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {TOOLS.map((t) => (
            <Card key={t.label}>
              <CardContent className="flex items-start gap-3 pt-6">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
                  <t.icon className="size-4" />
                </span>
                <div>
                  <p className="text-sm font-medium">{t.label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{t.body}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
