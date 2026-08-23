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
          <Link href="/" className="flex items-center gap-2 font-semibold">
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
            <ul className="mt-3 flex flex-col gap-2">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-sm text-muted-foreground hover:text-foreground"
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
