"use client";

import { useTransition } from "react";
import { Check, ChevronDown, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials } from "@/lib/utils";
import { selectChild } from "@/lib/actions/parent";
import type { ParentChild } from "@/lib/data/parent";

// Rendered only when the parent guards more than one child. With a single
// child the control would be a dropdown that can only ever pick what is
// already picked, so the layout shows a plain name label instead.
export function ChildSelector({
  childList,
  selectedChildId,
}: {
  childList: ParentChild[];
  selectedChildId: string;
}) {
  const [pending, startTransition] = useTransition();
  const selected = childList.find((c) => c.childId === selectedChildId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex items-center gap-2 rounded-lg border border-border px-2.5 py-1.5 text-sm font-medium outline-none transition-colors hover:bg-muted cursor-pointer"
        aria-label={`Viewing ${selected?.name ?? "child"}. Change child`}
      >
        <Avatar className="size-6">
          <AvatarFallback className="text-[10px]">{initials(selected?.name ?? "?")}</AvatarFallback>
        </Avatar>
        <span className="max-w-32 truncate">{selected?.name ?? "Select a child"}</span>
        {pending ? <Loader2 className="size-3.5 animate-spin" /> : <ChevronDown className="size-3.5" />}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-56">
        <DropdownMenuLabel>Viewing</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {childList.map((child) => (
          <DropdownMenuItem
            key={child.childId}
            onSelect={() => startTransition(() => void selectChild(child.childId))}
          >
            <Avatar className="size-6">
              <AvatarFallback className="text-[10px]">{initials(child.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{child.name}</p>
              {child.clinicianName && (
                <p className="truncate text-xs text-muted-foreground">with {child.clinicianName}</p>
              )}
            </div>
            {child.childId === selectedChildId && <Check className="size-4 shrink-0" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
