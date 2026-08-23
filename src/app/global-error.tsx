"use client";

import { useEffect } from "react";

// Catches errors thrown by the root layout itself (fonts, providers, etc.)
// — this is the one place Next.js requires you to render your own <html>.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif" }}>
        <div
          style={{
            display: "flex",
            minHeight: "100vh",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "1rem",
            textAlign: "center",
            padding: "1rem",
          }}
        >
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Something went wrong</h1>
          <p style={{ color: "#666", maxWidth: 420 }}>
            The app hit an unexpected error while loading. Try reloading the page.
          </p>
          <button
            onClick={() => reset()}
            style={{
              padding: "0.5rem 1.25rem",
              borderRadius: 6,
              background: "#7c3aed",
              color: "#fff",
              border: "none",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
