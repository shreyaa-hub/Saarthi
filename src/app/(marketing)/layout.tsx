import { getOptionalViewer } from "@/lib/auth/session";
import { Navbar } from "@/components/marketing/navbar";
import { Footer } from "@/components/marketing/footer";
import type { ProfileRole } from "@/lib/types/database";

// Resolved here rather than in the Navbar because the Navbar is a client
// component and this is where the request's session is reachable. Uses the
// non-redirecting variant: these pages must keep working for a logged-out
// visitor, which is the whole point of the public library.
export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const { role } = await getOptionalViewer();

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar role={(role as ProfileRole | null) ?? null} />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
