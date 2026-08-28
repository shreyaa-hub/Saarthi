"use client";

import { createContext, useContext, useEffect, useState, useSyncExternalStore } from "react";
import { Volume2, Square } from "lucide-react";
import { cn } from "@/lib/utils";

// Reads the instruction aloud, for a patient who cannot read it.
//
// The activities are built for children in speech and language therapy, many
// of whom are pre-readers — so until now every question needed an adult
// sitting alongside to read it out, which is most of the reason home practice
// does not happen. This is browser speech synthesis: no key, no network call,
// no audio stored anywhere.
//
// IMPORTANT — this is deliberately only ever attached to an element's prompt,
// which is the instruction ("Find each word in the grid"), and never to the
// options, passage, word list or cards. Reading the instruction aloud is an
// access accommodation. Reading the content aloud would hand the patient the
// answer to any task where decoding the words IS the skill being assessed,
// which is exactly what a word hunt or a word search measures.

// Whether a speaker may be offered at all. Default on: the player is the
// normal case and every prompt renderer would otherwise have to opt in.
// A library thumbnail turns it off — see CanvasPreview, which swallows every
// click, so a speaker there would be a control that visibly does nothing.
//
// Context rather than a prop because most prompts render inside per-type
// sub-components (DragMatchPlayer, SequencePlayer, …) that would each have to
// thread the flag down for no other reason.
const SpeakEnabledContext = createContext(true);

export function SpeakDisabled({ children }: { children: React.ReactNode }) {
  return <SpeakEnabledContext.Provider value={false}>{children}</SpeakEnabledContext.Provider>;
}

// Speech synthesis is absent in some browsers and disabled outright in
// others. Read through useSyncExternalStore, with a server snapshot of false,
// so the server and first client render agree and the button appears only
// once hydrated — the repo lints against the setState-in-an-effect version of
// this, and rightly: it flashes.
const NEVER_CHANGES = () => () => {};

function useSpeechAvailable() {
  return useSyncExternalStore(
    NEVER_CHANGES,
    () => typeof window !== "undefined" && "speechSynthesis" in window,
    () => false,
  );
}

export function SpeakButton({ text, className }: { text: string; className?: string }) {
  const enabled = useContext(SpeakEnabledContext);
  const available = useSpeechAvailable();
  const [speaking, setSpeaking] = useState(false);

  // Anything still being spoken when this unmounts — the next page of a
  // multi-page activity, or leaving the player — would otherwise carry on
  // talking over whatever comes next.
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const trimmed = text.trim();
  if (!enabled || !available || !trimmed) return null;

  const speak = () => {
    // Always cancel first: a second tap while speaking should stop it, and
    // queueing utterances is how you end up with three voices at once.
    window.speechSynthesis.cancel();
    if (speaking) {
      setSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(trimmed);
    // A little under normal pace. The default is brisk for a child still
    // decoding language, which is precisely this population.
    utterance.rate = 0.9;
    utterance.lang = document.documentElement.lang || "en";
    utterance.onend = () => setSpeaking(false);
    // Fires when speech is cut off or refused (an autoplay policy, or no
    // voice installed for the language). Without it the button sticks on
    // "stop" and the child has to guess why nothing happened.
    utterance.onerror = () => setSpeaking(false);

    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <button
      type="button"
      onClick={speak}
      // 24px square: the WCAG 2.5.8 minimum. This is a control a child taps,
      // so it does not lean on the inline-in-text exception the way the
      // tappable words in a word hunt do.
      className={cn(
        "ml-1.5 inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md align-middle text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        className,
      )}
      aria-label={speaking ? "Stop reading" : "Read the question aloud"}
      title={speaking ? "Stop reading" : "Read the question aloud"}
    >
      {speaking ? <Square className="size-3.5 fill-current" /> : <Volume2 className="size-4" />}
    </button>
  );
}
