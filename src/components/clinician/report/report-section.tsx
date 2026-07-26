// Shared shell for every report section: a plain heading + thin rule,
// tight document-appropriate spacing (not the app's card padding/shadow —
// a printed clinical document should read like a document, not a
// dashboard). `break-inside-avoid` only takes effect in paginated media
// (print), so it's harmless on screen and keeps each section from being
// awkwardly split across a page boundary when printed.
export function ReportSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="break-inside-avoid py-5 first:pt-0">
      <h2 className="mb-3 border-b border-gray-300 pb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500">
        {title}
      </h2>
      {children}
    </section>
  );
}
