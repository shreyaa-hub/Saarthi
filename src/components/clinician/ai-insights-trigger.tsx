"use client";

import { useState } from "react";
import { BrainCircuit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PatientInsightsPanel } from "@/components/clinician/patient-insights-panel";
import { formatDate } from "@/lib/utils";
import type { Database } from "@/lib/types/database";

type Insight = Database["public"]["Tables"]["ai_insights"]["Row"];

// AI as an assistant, not page content: a compact, always-present trigger
// (sized to sit in a Card header, next to "Performance summary") that opens
// the full AI insights experience in a Dialog on demand, instead of a
// permanent full-width section every clinician scrolls past on every visit.
// The AI logic itself (generation, refresh, API call) is untouched — it
// lives entirely in PatientInsightsPanel, reused here exactly as it is.
//
// Deliberately a plain `ghost` Button (the same variant/size the dashboard's
// "Recent activity → View all" header action already uses) rather than a
// bordered/filled chip — the Performance Summary's numbers are the thing
// this card exists to show; the AI action should read as a quiet secondary
// affordance next to that heading, not a second thing competing for
// attention. The "last generated" context sits beside it as small muted
// text rather than inside the button, so the button itself stays minimal.
export function AiInsightsTrigger({
  clinicianPatientId,
  patientId,
  initialInsight,
  attemptCount,
}: {
  clinicianPatientId: string;
  patientId: string | null;
  initialInsight: Insight | null;
  attemptCount: number;
}) {
  const [open, setOpen] = useState(false);
  const disabled = !patientId || attemptCount === 0;

  const context = disabled
    ? !patientId
      ? "Available once linked"
      : "Available after first activity"
    : initialInsight
      ? `Generated ${formatDate(initialInsight.generated_at)}`
      : "Not generated yet";

  return (
    <>
      <div className="flex shrink-0 flex-col items-end gap-0.5">
        <Button variant="ghost" size="sm" onClick={() => setOpen(true)} disabled={disabled} className="h-7 px-2">
          <BrainCircuit className="size-3.5" /> AI insights
        </Button>
        <span className="pr-2 text-[11px] text-muted-foreground">{context}</span>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BrainCircuit className="size-4 text-primary" /> AI insights
            </DialogTitle>
            <DialogDescription>AI-generated progress summary for this patient.</DialogDescription>
          </DialogHeader>
          <PatientInsightsPanel
            clinicianPatientId={clinicianPatientId}
            patientId={patientId}
            initialInsight={initialInsight}
            attemptCount={attemptCount}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
