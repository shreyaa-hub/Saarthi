import Link from "next/link";
import { Compass, LayoutTemplate, Send, BrainCircuit } from "lucide-react";

const highlights = [
  { icon: LayoutTemplate, text: "Author activities on a drag-and-drop canvas" },
  { icon: Send, text: "Assign them to patients in one click" },
  { icon: BrainCircuit, text: "Monitor progress with AI-assisted insight" },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <div className="relative hidden w-[42%] flex-col justify-between overflow-hidden bg-sidebar p-10 text-sidebar-foreground lg:flex">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_10%,_var(--sidebar-accent),_transparent_55%)]"
        />
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Compass className="size-5" />
          </span>
          <span className="text-lg">Saarthi Coach</span>
        </Link>

        <div>
          <blockquote className="font-display max-w-sm text-2xl font-medium leading-snug text-balance">
            A canvas for therapy activities — and a clear line of sight into every
            patient&apos;s progress.
          </blockquote>
          <ul className="mt-8 flex flex-col gap-4">
            {highlights.map((h) => (
              <li key={h.text} className="flex items-center gap-3 text-sm text-sidebar-foreground/80">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-accent text-white">
                  <h.icon className="size-4" />
                </span>
                {h.text}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-sidebar-foreground/50">
          © {new Date().getFullYear()} Saarthi Coach
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center bg-muted/40 px-4 py-10">
        <div className="w-full max-w-md">
          <Link href="/" className="mb-8 flex items-center justify-center gap-2 text-foreground lg:hidden">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Compass className="size-5" />
            </span>
            <span className="text-lg font-semibold">Saarthi Coach</span>
          </Link>
          {children}
        </div>
      </div>
    </div>
  );
}
