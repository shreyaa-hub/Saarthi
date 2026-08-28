"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { MessageSquarePlus } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { setAttemptNote } from "@/lib/actions/attempts";
import { AttemptReview } from "@/components/attempt-review";
import { formatDate } from "@/lib/utils";

type Attempt = {
  id: string;
  assignment_id: string;
  score: number | null;
  correct_count: number;
  total_count: number;
  clinician_note: string | null;
  completed_at: string;
};

export function AttemptNotes({
  attempts,
  titleByAssignment,
  clinicianPatientId,
}: {
  attempts: Attempt[];
  titleByAssignment: Record<string, string>;
  clinicianPatientId: string;
}) {
  if (attempts.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">No completed attempts yet.</p>
    );
  }

  return (
    <div className="flex flex-col divide-y divide-border">
      {[...attempts]
        .sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime())
        .map((a) => (
          <AttemptRow
            key={a.id}
            attempt={a}
            title={titleByAssignment[a.assignment_id] ?? "Activity"}
            clinicianPatientId={clinicianPatientId}
          />
        ))}
    </div>
  );
}

function AttemptRow({
  attempt,
  title,
  clinicianPatientId,
}: {
  attempt: Attempt;
  title: string;
  clinicianPatientId: string;
}) {
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState(attempt.clinician_note ?? "");
  const [, startTransition] = useTransition();

  const save = () => {
    setEditing(false);
    startTransition(async () => {
      const { error } = await setAttemptNote(attempt.id, clinicianPatientId, note);
      if (error) toast.error(error);
    });
  };

  return (
    <div className="flex flex-col gap-2 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground">{formatDate(attempt.completed_at)}</p>
        </div>
        <p className="shrink-0 text-sm font-semibold">
          {attempt.correct_count}/{attempt.total_count} ({attempt.score ?? 0}%)
        </p>
      </div>

      <AttemptReview attemptId={attempt.id} />

      {editing ? (
        <div className="flex flex-col gap-2">
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note visible to the patient — e.g. what to focus on next session…"
            rows={2}
            autoFocus
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={save}>Save note</Button>
            <Button size="sm" variant="ghost" onClick={() => { setNote(attempt.clinician_note ?? ""); setEditing(false); }}>
              Cancel
            </Button>
          </div>
        </div>
      ) : attempt.clinician_note ? (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded-md bg-secondary px-3 py-2 text-left text-xs text-secondary-foreground hover:opacity-80 cursor-pointer"
        >
          {attempt.clinician_note}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="flex w-fit items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
        >
          <MessageSquarePlus className="size-3.5" /> Add a note
        </button>
      )}
    </div>
  );
}
