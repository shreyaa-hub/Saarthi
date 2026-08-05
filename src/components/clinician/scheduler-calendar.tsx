"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isToday,
  isBefore,
} from "date-fns";
import { ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { Database } from "@/lib/types/database";

type Assignment = Database["public"]["Tables"]["assignments"]["Row"] & {
  profiles?: { full_name: string } | null;
};

const statusVariant: Record<string, "success" | "secondary" | "outline"> = {
  completed: "success",
  in_progress: "secondary",
  assigned: "outline",
};

function isOverdue(a: Assignment) {
  if (!a.due_date || a.status === "completed") return false;
  return isBefore(new Date(a.due_date), new Date(new Date().toDateString()));
}

// `showAssignee` and `viewAllHref` exist so the parent area can reuse this
// calendar as-is: a parent is only ever looking at one child, so naming the
// assignee on every row is noise, and "view all" must not point into the
// clinician area they can't reach.
export function SchedulerCalendar({
  assignments,
  showAssignee = true,
  viewAllHref = "/clinician/assignments",
  viewAllLabel = "View all assignments",
}: {
  assignments: Assignment[];
  showAssignee?: boolean;
  viewAllHref?: string;
  viewAllLabel?: string;
}) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const dated = useMemo(() => assignments.filter((a) => a.due_date), [assignments]);
  const undated = useMemo(() => assignments.filter((a) => !a.due_date), [assignments]);

  const byDay = useMemo(() => {
    const map = new Map<string, Assignment[]>();
    for (const a of dated) {
      const key = a.due_date as string;
      const list = map.get(key) ?? [];
      list.push(a);
      map.set(key, list);
    }
    return map;
  }, [dated]);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month));
    const end = endOfWeek(endOfMonth(month));
    return eachDayOfInterval({ start, end });
  }, [month]);

  const selectedAssignments = selectedDay ? byDay.get(format(selectedDay, "yyyy-MM-dd")) ?? [] : [];

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex flex-col gap-4 pt-6">
          <div className="flex items-center justify-between">
            <p className="font-display text-lg font-semibold">{format(month, "MMMM yyyy")}</p>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" onClick={() => setMonth((m) => subMonths(m, 1))}>
                <ChevronLeft className="size-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setMonth(startOfMonth(new Date()))}>
                Today
              </Button>
              <Button variant="outline" size="sm" onClick={() => setMonth((m) => addMonths(m, 1))}>
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-border bg-border text-xs">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="bg-card px-2 py-1.5 text-center font-medium text-muted-foreground">
                {d}
              </div>
            ))}
            {days.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const items = byDay.get(key) ?? [];
              const inMonth = isSameMonth(day, month);
              const dayIsOverdue = items.some((a) => isOverdue(a));
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => items.length > 0 && setSelectedDay(day)}
                  className={cn(
                    "flex min-h-24 flex-col items-start gap-1 bg-card p-1.5 text-left align-top",
                    !inMonth && "bg-muted/40 text-muted-foreground/60",
                    items.length > 0 && "cursor-pointer hover:bg-muted",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-5 items-center justify-center rounded-full text-[11px]",
                      isToday(day) && "bg-primary text-primary-foreground font-semibold",
                    )}
                  >
                    {format(day, "d")}
                  </span>
                  <div className="flex w-full flex-col gap-0.5">
                    {items.slice(0, 2).map((a) => (
                      <span
                        key={a.id}
                        className={cn(
                          "truncate rounded px-1 py-0.5 text-[10px] font-medium",
                          isOverdue(a)
                            ? "bg-destructive/15 text-destructive"
                            : "bg-secondary text-secondary-foreground",
                        )}
                      >
                        {a.title}
                      </span>
                    ))}
                    {items.length > 2 && (
                      <span className="text-[10px] text-muted-foreground">+{items.length - 2} more</span>
                    )}
                    {dayIsOverdue && (
                      <AlertTriangle className="size-3 text-destructive" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {undated.length > 0 && (
        <Card>
          <CardContent className="flex flex-col gap-2 pt-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              No due date ({undated.length})
            </p>
            <div className="flex flex-col divide-y divide-border">
              {undated.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-3 py-2">
                  <p className="truncate text-sm font-medium">{a.title}</p>
                  <div className="flex items-center gap-2">
                    {showAssignee && (
                      <span className="text-xs text-muted-foreground">{a.profiles?.full_name ?? "Patient"}</span>
                    )}
                    <Badge variant={statusVariant[a.status] ?? "outline"}>{a.status.replace("_", " ")}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={selectedDay !== null} onOpenChange={(open) => !open && setSelectedDay(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedDay ? format(selectedDay, "EEEE, MMMM d") : ""}</DialogTitle>
            <DialogDescription>
              {selectedAssignments.length} assignment{selectedAssignments.length === 1 ? "" : "s"} due
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col divide-y divide-border">
            {selectedAssignments.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{a.title}</p>
                  {showAssignee && (
                    <p className="text-xs text-muted-foreground">{a.profiles?.full_name ?? "Patient"}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {isOverdue(a) && (
                    <Badge variant="outline" className="gap-1 border-destructive/40 text-destructive">
                      <AlertTriangle className="size-3" /> Overdue
                    </Badge>
                  )}
                  <Badge variant={statusVariant[a.status] ?? "outline"}>{a.status.replace("_", " ")}</Badge>
                </div>
              </div>
            ))}
          </div>
          <Button asChild variant="outline" size="sm" className="self-start">
            <Link href={viewAllHref}>{viewAllLabel}</Link>
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
