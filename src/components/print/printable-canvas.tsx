import type { TemplateCanvas } from "@/lib/types/canvas";
import { allPages } from "@/lib/types/canvas";
import { pageStyleBackground } from "@/lib/canvas/page-style";
import { ElementPreview } from "@/components/canvas/element-preview";

// A canvas laid out for paper: every page on its own sheet, at the size it
// was authored, with nothing but the content on it.
//
// Reuses ElementPreview rather than growing a second renderer, so a worksheet
// prints as exactly what the clinician saw while building it. `hideAnswers`
// is passed through because the preview is also the authoring view, where
// showing the answer key is correct — on a sheet handed to a patient it very
// much is not.
//
// Sizing: the physical page is set to the canvas's own dimensions, so one
// authored page is exactly one sheet. Saying only `size: portrait` does not
// do this — it sets orientation and leaves the paper at the browser default
// (US Letter here), and an A4-shaped 794x1123 canvas is taller than Letter,
// so every sheet spilled a sliver onto a second page. Measured: a two-page
// worksheet came out as a four-page PDF.
//
// A canvas is authored in CSS pixels and browsers print CSS pixels at 96dpi,
// so 794x1123 becomes A4 exactly. Margin is zero because the canvas already
// is the whole page — its own elements carry the margins the author drew.
export function PrintableCanvas({ canvas }: { canvas: TemplateCanvas }) {
  const pages = allPages(canvas);

  return (
    <>
      <style>{`
        @page { size: ${canvas.width}px ${canvas.height}px; margin: 0; }
        @media print {
          /* Background fills and page rulings are the content here, not
             decoration — without this browsers drop them by default and a
             ruled worksheet prints blank. */
          .print-sheet, .print-sheet * {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print-sheet { break-after: page; page-break-after: always; }
          .print-sheet:last-of-type { break-after: auto; page-break-after: auto; }
        }
      `}</style>

      {pages.map((page) => (
        <div
          key={page.id}
          className="print-sheet relative mx-auto mb-6 shadow-sm ring-1 ring-gray-200 print:mb-0 print:shadow-none print:ring-0"
          style={{
            width: canvas.width,
            height: canvas.height,
            ...pageStyleBackground(page.pageStyle, canvas.background),
          }}
        >
          {page.elements.map((el) => (
            <div
              key={el.id}
              className="absolute"
              style={{
                left: el.x,
                top: el.y,
                width: el.w,
                height: el.h,
                transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
              }}
            >
              <ElementPreview element={el} hideAnswers />
            </div>
          ))}
        </div>
      ))}
    </>
  );
}
