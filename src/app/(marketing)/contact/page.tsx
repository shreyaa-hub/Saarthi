import { Badge } from "@/components/ui/badge";
import { Mail, MapPin } from "lucide-react";
import { ContactForm } from "@/components/marketing/contact-form";
import { Reveal } from "@/components/motion/reveal";

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <Reveal>
        <Badge variant="secondary">Contact</Badge>
        <h1 className="font-display mt-4 text-4xl font-semibold tracking-tight">Let&apos;s talk</h1>
        <p className="mt-3 max-w-lg text-muted-foreground">
          Questions about onboarding your clinic, or feedback on the Studio? Send a note.
        </p>
      </Reveal>

      <Reveal delay={0.1} className="mt-10 grid gap-10 md:grid-cols-2">
        <div className="flex flex-col gap-4 text-sm">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-lg bg-secondary text-primary">
              <Mail className="size-4" />
            </span>
            <span className="text-muted-foreground">hello@verbalcoach.app</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-lg bg-secondary text-primary">
              <MapPin className="size-4" />
            </span>
            <span className="text-muted-foreground">Remote-first team</span>
          </div>
        </div>
        <ContactForm />
      </Reveal>
    </div>
  );
}
