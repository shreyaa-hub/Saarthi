import { LinkChildCard } from "@/components/parent/link-child-card";

// Every parent screen is about a specific child, so each of them collapses to
// this same prompt until at least one is linked — rather than each inventing
// its own empty state for a situation with exactly one resolution.
export function NoChildState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-display text-2xl font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <LinkChildCard />
    </div>
  );
}
