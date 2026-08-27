import type { MultipleChoiceElement, MultipleChoiceOption } from "@/lib/types/canvas";
import { optionPictureStyle } from "@/lib/canvas/appearance";
import { ImageIcon } from "lucide-react";

// The picture on one multiple-choice answer, shared by the authoring preview
// and the player so a picture-choice question cannot look like one thing on
// the canvas and another to the patient.
//
// In a grid, an answer with no picture still draws a placeholder box. Without
// it the card collapses to the height of its label and the row of answers
// comes out ragged, which reads as a rendering fault rather than as "you have
// not added this photo yet".
export function OptionPicture({
  element,
  option,
  grid,
}: {
  element: MultipleChoiceElement;
  option: MultipleChoiceOption;
  grid: boolean;
}) {
  if (option.imageSrc) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={option.imageSrc}
        alt=""
        className="shrink-0 rounded object-cover"
        style={optionPictureStyle(element, grid)}
      />
    );
  }

  if (!grid) return null;

  return (
    <span
      className="flex shrink-0 items-center justify-center rounded border border-dashed border-border bg-muted text-muted-foreground"
      style={optionPictureStyle(element, grid)}
    >
      <ImageIcon className="size-4" />
    </span>
  );
}
