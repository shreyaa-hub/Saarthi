"use client";

import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Only rendered when a patient has more than one active clinician — the
// common case (0 or 1) never shows this at all. Navigates via the `with`
// query param on the same route rather than local state, so refresh,
// back/forward, and bookmarking a specific conversation all behave
// correctly.
export function ConversationSelector({
  clinicians,
  selectedId,
}: {
  clinicians: { id: string; name: string }[];
  selectedId: string;
}) {
  const router = useRouter();

  return (
    <Select value={selectedId} onValueChange={(id) => router.push(`/patient/messages?with=${id}`)}>
      <SelectTrigger className="w-64">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {clinicians.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            {c.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
