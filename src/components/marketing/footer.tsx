import Link from "next/link";
import { Compass } from "lucide-react";

const columns = [
  {
    title: "Product",
    links: [
      { href: "/features", label: "Features" },
      { href: "/workflow", label: "Workflow" },
      { href: "/marketplace", label: "Marketplace" },
    ],
  },
  {
    title: "Resources",
    links: [
      { href: "/library/templates", label: "Template Library" },
      { href: "/library/worksheets", label: "Worksheet Library" },
      { href: "/library/assets", label: "Asset Library" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/contact", label: "Contact" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 md:grid-cols-4">
        <div>
          <Link href="/" className="flex min-h-11 items-center gap-2 font-semibold">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Compass className="size-4" />
            </span>
            Verbal Coach
          </Link>
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">
            A canvas-based therapy authoring studio for clinicians — build activities,
            assign them, and monitor progress with AI-assisted insight.
          </p>
        </div>
        {columns.map((col) => (
          <div key={col.title}>
            <h4 className="text-sm font-semibold text-foreground">{col.title}</h4>
            {/* gap-0 with padding on the links rather than gap-2 with bare
                text: the padding is what makes the tappable area big enough.
                Measured before this, every footer link had an 18px hit area
                — below the 24px WCAG 2.5.8 minimum — because a bare text
                link is only as tall as its own line box. */}
            <ul className="mt-1 flex flex-col">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="-mx-2 inline-flex min-h-11 items-center rounded-md px-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Verbal Coach. All rights reserved.
      </div>
    </footer>
  );
}
