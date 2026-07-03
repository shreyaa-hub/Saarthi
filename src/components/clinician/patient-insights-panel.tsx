"use client";

import { useState } from "react";
import { BrainCircuit, Loader2, Sparkles, ThumbsUp, TriangleAlert, Lightbulb } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import type { Database } from "@/lib/types/database";

type Insight = Database["public"]["Tables"]["ai_insights"]["Row"];

function asStringList(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

export function PatientInsightsPanel({
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
  const [insight, setInsight] = useState(initialInsight);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clinicianPatientId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Couldn't generate insights.");
        return;
      }
      setInsight(data.insight);
      toast.success("Insights updated");
    } catch {
      toast.error("Network error while generating insights.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-secondary text-primary">
            <BrainCircuit className="size-4" />
          </span>
          <CardTitle>AI insights</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {!patientId ? (
          <p className="text-sm text-muted-foreground">Available once this patient links their account.</p>
        ) : attemptCount === 0 ? (
          <p className="text-sm text-muted-foreground">
            No completed activities yet — insights unlock after the first attempt.
          </p>
        ) : (
          <>
            <Button onClick={generate} disabled={loading} variant={insight ? "outline" : "default"} size="sm">
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              {insight ? "Refresh insights" : "Generate insights"}
            </Button>

            {insight && (
              <div className="flex flex-col gap-4 text-sm">
                <p className="text-muted-foreground">{insight.summary}</p>

                {asStringList(insight.strengths).length > 0 && (
                  <InsightList
                    icon={<ThumbsUp className="size-3.5 text-success" />}
                    label="Strengths"
                    items={asStringList(insight.strengths)}
                  />
                )}
                {asStringList(insight.concerns).length > 0 && (
                  <InsightList
                    icon={<TriangleAlert className="size-3.5 text-accent" />}
                    label="Concerns"
                    items={asStringList(insight.concerns)}
                  />
                )}
                {asStringList(insight.recommendations).length > 0 && (
                  <InsightList
                    icon={<Lightbulb className="size-3.5 text-primary" />}
                    label="Next session"
                    items={asStringList(insight.recommendations)}
                  />
                )}
                <p className="text-xs text-muted-foreground">
                  Generated {formatDate(insight.generated_at)} from {insight.attempts_considered} attempt
                  {insight.attempts_considered === 1 ? "" : "s"} · Not a clinical diagnosis.
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function InsightList({ icon, label, items }: { icon: React.ReactNode; label: string; items: string[] }) {
  return (
    <div>
      <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {icon} {label}
      </p>
      <ul className="flex flex-col gap-1">
        {items.map((item, i) => (
          <li key={i} className="flex gap-1.5">
            <span className="mt-1.5 size-1 shrink-0 rounded-full bg-current opacity-50" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
