import type { Metadata } from "next";
import { GuestStudio } from "@/components/canvas/guest-studio";

export const metadata: Metadata = {
  title: "Try the Studio — Verbal Coach",
  description:
    "Build a printable therapy worksheet in your browser. No account needed to start.",
};

// Deliberately outside every shell and outside the (marketing) layout: the
// editor is a full-height workspace that owns the whole viewport, exactly as
// it does for a signed-in user. Public by design — /try is not in the proxy's
// protected prefix list, so a logged-out visitor reaches it directly.
export default function TryStudioPage() {
  return <GuestStudio />;
}
