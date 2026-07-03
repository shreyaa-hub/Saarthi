import Link from "next/link";
import { Compass } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-10">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2 text-foreground">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Compass className="size-5" />
          </span>
          <span className="text-lg font-semibold">Saarthi Coach</span>
        </Link>
        {children}
      </div>
    </div>
  );
}
