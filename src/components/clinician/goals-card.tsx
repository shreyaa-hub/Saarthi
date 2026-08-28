"use client";

import { useState, useTransition } from "react";
import { Plus, Loader2, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { createGoal, setGoalStatus, deleteGoal } from "@/lib/actions/goals";
import type { PatientGoal } from "@/lib/goals";
import type { AnalyticsAttempt } from "@/lib/analytics/types";
import { GoalRow } from "@/components/goals/goal-progress-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// The therapy domains a goal can be scoped to. Matches the values the Studio
// puts on a template — a goal scoped to a domain no template uses would never
// count anything, so this list is deliberately the same one.
const DOMAINS = [
  "Articulation",
  "Language",
  "Fluency",
  "Cognitive",
  "Social / Pragmatics",
  "Behavioral",
  "General",
];

export function GoalsCard({
  patientId,
  clinicianPatientId,
  goals,
  attempts,
}: {
  patientId: string;
  clinicianPatientId: string;
  goals: PatientGoal[];
  attempts: AnalyticsAttempt[];
}) {
  const [adding, setAdding] = useState(false);
  const active = goals.filter((g) => g.status === "active");
  const retired = goals.filter((g) => g.status !== "active");

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          What this patient is working towards, measured against the work they actually do.
        </p>
        {!adding && (
          <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
            <Plus className="size-4" /> Add goal
          </Button>
        )}
      </div>

      {adding && (
        <GoalForm
          patientId={patientId}
          clinicianPatientId={clinicianPatientId}
          onDone={() => setAdding(false)}
        />
      )}

      {goals.length === 0 && !adding ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No goals set yet. A goal turns the accuracy figures above into something to pass or fail.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {[...active, ...retired].map((goal) => (
            <GoalRow key={goal.id} goal={goal} attempts={attempts}>
              <GoalMenu goal={goal} clinicianPatientId={clinicianPatientId} />
            </GoalRow>
          ))}
        </ul>
      )}
    </div>
  );
}

function GoalMenu({ goal, clinicianPatientId }: { goal: PatientGoal; clinicianPatientId: string }) {
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<{ error: string | null }>, ok: string) =>
    startTransition(async () => {
      const { error } = await fn();
      if (error) toast.error(error);
      else toast.success(ok);
    });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 shrink-0"
          aria-label={`Actions for goal: ${goal.title}`}
          disabled={pending}
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <MoreHorizontal className="size-4" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {goal.status !== "achieved" && (
          <DropdownMenuItem
            onClick={() => run(() => setGoalStatus(goal.id, "achieved", clinicianPatientId), "Goal marked achieved")}
          >
            Mark achieved
          </DropdownMenuItem>
        )}
        {goal.status !== "active" && (
          <DropdownMenuItem
            onClick={() => run(() => setGoalStatus(goal.id, "active", clinicianPatientId), "Goal reopened")}
          >
            Reopen
          </DropdownMenuItem>
        )}
        {goal.status !== "archived" && (
          <DropdownMenuItem
            onClick={() => run(() => setGoalStatus(goal.id, "archived", clinicianPatientId), "Goal archived")}
          >
            Archive
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          variant="destructive"
          onClick={() => run(() => deleteGoal(goal.id, clinicianPatientId), "Goal deleted")}
        >
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function GoalForm({
  patientId,
  clinicianPatientId,
  onDone,
}: {
  patientId: string;
  clinicianPatientId: string;
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();
  // Controlled so the Select's value reaches the FormData — a Radix Select is
  // not a native <select> and contributes nothing to the form on its own.
  const [domain, setDomain] = useState("any");

  return (
    <form
      className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3"
      action={(formData) => {
        formData.set("patient_id", patientId);
        formData.set("clinician_patient_id", clinicianPatientId);
        formData.set("domain", domain);
        startTransition(async () => {
          const { error } = await createGoal(formData);
          if (error) toast.error(error);
          else {
            toast.success("Goal added");
            onDone();
          }
        });
      }}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="goal_title">Goal</Label>
        <Input
          id="goal_title"
          name="title"
          required
          maxLength={200}
          placeholder="e.g. 80% on /s/ in initial position"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="goal_domain">Counts which activities</Label>
          <Select value={domain} onValueChange={setDomain}>
            <SelectTrigger id="goal_domain">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any activity</SelectItem>
              {DOMAINS.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="goal_target">Target accuracy (%)</Label>
          <Input id="goal_target" name="target_accuracy" type="number" min={1} max={100} defaultValue={80} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="goal_window">Over how many activities</Label>
          <Input id="goal_window" name="window_attempts" type="number" min={1} max={50} defaultValue={5} />
        </div>
      </div>

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" />} Add goal
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone} disabled={pending}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
