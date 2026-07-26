"use client";

import { useState } from "react";
import { BrainCircuit, ChevronRight } from "lucide-react";
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
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled}
        className="flex shrink-0 items-center gap-2 rounded-lg border border-border bg-secondary/40 py-1.5 pl-2 pr-2.5 text-left transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-secondary/40"
      >
        <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-secondary text-primary">
          <BrainCircuit className="size-3.5" />
        </span>
        <span className="flex flex-col leading-tight">
          <span className="text-xs font-medium">AI insights</span>
          <span className="text-[11px] text-muted-foreground">{context}</span>
        </span>
        {!disabled && <ChevronRight className="ml-0.5 size-3.5 shrink-0 text-muted-foreground" />}
      </button>

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
