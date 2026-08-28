// Canvas document schema for authored therapy activities.
// Stored verbatim in templates.canvas / assignments.canvas_snapshot (jsonb).

export type ElementBase = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation?: number;
  locked?: boolean;
};

export type TextElement = ElementBase & {
  type: "text";
  content: string;
  fontSize: number;
  fontWeight: "normal" | "medium" | "bold";
  color: string;
  align: "left" | "center" | "right";
  // Optional so every canvas authored before these existed still parses and
  // renders identically — absent means off.
  italic?: boolean;
  underline?: boolean;
};

export type ImageElement = ElementBase & {
  type: "image";
  src: string;
  alt: string;
  objectFit: "cover" | "contain";
  radius: number;
};

export type ShapeElement = ElementBase & {
  type: "shape";
  shape: "rectangle" | "circle" | "star" | "speech-bubble";
  fill: string;
  stroke: string;
  strokeWidth: number;
};

export type AudioElement = ElementBase & {
  type: "audio";
  src: string;
  label: string;
};

export type ButtonElement = ElementBase & {
  type: "button";
  label: string;
  action: "next" | "submit" | "restart";
  style: "primary" | "secondary" | "accent";
};

// Presentation controls shared by every interactive type that draws cards or
// chips of authored content. All optional, and every consumer falls back to
// the same defaults below, so an element authored before these existed
// renders byte-identically to how it always did.
//
// Deliberately per-element rather than global: one activity can hold a
// picture-matching task that wants big thumbnails next to a word-sorting
// task that wants none, and a document-wide setting could not serve both.
export type InteractiveAppearance = {
  fontSize?: number;
  textColor?: string;
  cardColor?: string;
  // The height of an embedded thumbnail in pixels. Width follows from
  // imageShape below, so one number is all an author has to set.
  imageSize?: number;
  // Thumbnails used to be square, which crops a landscape photo down the
  // sides — and almost every photo a clinician uploads is landscape. "wide"
  // gives the box a 4:3 landscape ratio so the picture survives the crop;
  // "square" is still there for icon-like art that was drawn square.
  imageShape?: "square" | "wide";
};

export const APPEARANCE_DEFAULTS = {
  fontSize: 14,
  imageSize: 28,
  imageShape: "wide",
} as const;

export type MultipleChoiceOption = {
  id: string;
  label: string;
  imageSrc?: string;
  correct: boolean;
};

export type MultipleChoiceElement = ElementBase & InteractiveAppearance & {
  type: "multipleChoice";
  prompt: string;
  options: MultipleChoiceOption[];
  allowMultiple: boolean;
  // How the answers are laid out under the question.
  //
  // "list" stacks them as rows of text with an optional thumbnail — right for
  // a reading task, where the words are the answer.
  //
  // "grid" puts them side by side as picture cards, which is the standard
  // picture-choice format: the clinician says the word and the patient points
  // at one of four photographs. The picture is the answer there, so it fills
  // the card rather than sitting beside the text as a thumbnail.
  //
  // Optional, defaulting to "list", so every question authored before this
  // renders exactly as it always did.
  layout?: "list" | "grid";
  // Pictures across, in grid layout. Four is the usual field of choices in
  // therapy materials, which is why it is the default.
  columns?: number;
};

export const MC_DEFAULT_COLUMNS = 4;

export type FillBlankElement = ElementBase & InteractiveAppearance & {
  type: "fillBlank";
  template: string; // use "___" to mark the blank
  answer: string;
  caseSensitive: boolean;
};

export type MatchPair = {
  id: string;
  left: string;
  right: string;
  // Optional photo for either side, independent of the other — a clinician
  // can build a picture-to-word pair (leftImage set, right plain text), a
  // picture-to-picture pair (both set), or leave both unset for the
  // text-only pair this type has always supported. Never required, so
  // every dragMatch element authored before this still parses unchanged.
  leftImage?: string;
  rightImage?: string;
};

export type DragMatchElement = ElementBase & InteractiveAppearance & {
  type: "dragMatch";
  prompt: string;
  pairs: MatchPair[];
};

export type SequenceItem = {
  id: string;
  label: string;
  order: number;
  // Optional, so every sequence authored before this still parses. Picture
  // sequencing — put the photos of the story in order — is a standard task,
  // and it is the version that works for a patient who cannot yet read.
  image?: string;
};

export type SequenceElement = ElementBase & InteractiveAppearance & {
  type: "sequence";
  prompt: string;
  items: SequenceItem[];
};

export type SortCategory = {
  id: string;
  label: string;
};

// categoryId is the correct bucket for this item — the answer key, not the
// patient's placement. The patient's in-progress placement lives entirely in
// the attempt response (itemId -> categoryId), same split as DragMatchElement
// (pairs = the key, the response = what the patient did).
export type SortItem = {
  id: string;
  label: string;
  categoryId: string;
  image?: string;
};

export type SortCategorizeElement = ElementBase & InteractiveAppearance & {
  type: "sortCategorize";
  prompt: string;
  categories: SortCategory[];
  items: SortItem[];
};

// Authoring data only — each pair becomes exactly two face-down cards at
// play time (ids `${id}-a` / `${id}-b`, shuffled together), not stored as
// individual cards here. A clinician thinks in terms of "the six things to
// find pairs of," not "twelve cards, coincidentally in matching pairs."
//
// The two cards can show different things. label/image are side A; labelB
// and imageB are side B, and when they are unset side B mirrors side A —
// which is both the classic identical-cards game and exactly how every pair
// authored before these fields existed keeps behaving.
//
// Two different sides is what makes the game teach something: a photo of a
// dog paired with the written word "Dog" trains the association, where two
// identical cards only train recall of position.
export type MemoryPair = {
  id: string;
  label: string;
  image?: string;
  labelB?: string;
  imageB?: string;
};

// The two faces of one pair, resolved. Side B falls back to side A so
// callers never repeat the mirroring rule.
export function memoryPairFaces(pair: MemoryPair): {
  a: { label: string; image?: string };
  b: { label: string; image?: string };
} {
  const bHasOwnContent = Boolean(pair.labelB?.trim() || pair.imageB);
  return {
    a: { label: pair.label, image: pair.image },
    b: bHasOwnContent
      ? { label: pair.labelB?.trim() || "", image: pair.imageB }
      : { label: pair.label, image: pair.image },
  };
}

export type MemoryMatchElement = ElementBase & InteractiveAppearance & {
  type: "memoryMatch";
  prompt: string;
  pairs: MemoryPair[];
};

export type WordHuntElement = ElementBase & InteractiveAppearance & {
  type: "wordHunt";
  prompt: string;
  passage: string;
  // Matched case-insensitively against the passage (see lib/canvas/word-hunt.ts).
  targetWords: string[];
};

// A region of the picture the patient is meant to find and tap. Position and
// size are percentages of the image box (0-100), never pixels: the image is
// scaled to fit whatever the element is resized to and whatever zoom the
// player is at, and a pixel offset would drift away from the thing it marks
// the moment either changed.
export type Hotspot = {
  id: string;
  label: string;
  xPct: number;
  yPct: number;
  wPct: number;
  hPct: number;
};

// "Find the things in the picture" — a picture scene the patient taps
// directly, which is the one interaction none of the other types cover:
// every other type is a list of authored choices, this one is spatial.
// Widely used in speech therapy for scene description and vocabulary work.
export type ImageHotspotsElement = ElementBase & InteractiveAppearance & {
  type: "imageHotspots";
  prompt: string;
  src: string;
  alt: string;
  hotspots: Hotspot[];
  // Whether an outline is drawn around each target before it is found. Off
  // is the real activity (the patient has to search); on turns it into a
  // labelling exercise, useful for a younger or more impaired patient.
  showOutlines: boolean;
  // How the picture sits in the element's box. "contain" fits the whole
  // picture inside, letterboxing a portrait photo into a narrow strip;
  // "cover" fills the box widthways and crops the overflow; "fill" stretches
  // it. Optional and defaulting to "contain" so elements authored before this
  // existed are unchanged.
  fit?: "contain" | "cover" | "fill";
};

// One word to drill, and how many times it should be produced. Articulation
// practice is repetition-counted ("say it five times"), which no existing
// type expresses — every other one is answered once and done.
export type DrillWord = {
  id: string;
  label: string;
  image?: string;
  target: number;
};

export type PracticeDrillElement = ElementBase & InteractiveAppearance & {
  type: "practiceDrill";
  prompt: string;
  words: DrillWord[];
};

// One continuous pen stroke, as points in the pad's own coordinate space
// where 0,0 is the top-left corner and 1,1 the bottom-right. Normalised for
// the same reason hotspots are: the pad is drawn at whatever size the
// element was resized to and at whatever zoom the player is at, and a stroke
// stored in pixels would land somewhere else the moment either changed —
// including on the clinician's screen when they open the finished attempt.
export type DrawStroke = { x: number; y: number }[];

// Draw or trace with a finger. The one thing the patient does here that no
// other element type asks for is a motor act rather than a choice, which is
// what fine-motor and handwriting work actually is — and it is the only type
// that produces something the clinician looks at rather than marks.
//
// backgroundSrc turns it from free drawing into tracing: put a letter, a
// shape or a maze behind the pad and the patient follows it.
export type DrawPadElement = ElementBase & InteractiveAppearance & {
  type: "drawPad";
  prompt: string;
  backgroundSrc?: string;
  strokeColor: string;
  strokeWidth: number;
};

// An open written response — a narrative, a sentence about a picture, a
// description. Deliberately unmarked: there is no key a computer could check
// a language sample against, so it is scored as "attempted" and the words
// themselves are what the clinician reads.
export type LongAnswerElement = ElementBase & InteractiveAppearance & {
  type: "longAnswer";
  prompt: string;
  placeholder: string;
  // 0 means "anything at all counts". Above 0 the patient has to reach that
  // many words before the element counts as done, which is how a clinician
  // asks for a sentence rather than a single word.
  minWords: number;
  // How many ruled lines the printed version gets. Screen-side the box grows
  // with the element, so this only shapes the paper copy.
  lines: number;
};

// --- Simple tasks for young or pre-verbal children ---------------------------
// Everything above asks the child to read a list, drag something precisely, or
// hold several items in mind at once. These three deliberately do not. Each is
// one question with a small number of very large targets, which is what works
// for a three-year-old, for a child with limited language, and for anyone
// still learning to use a touchscreen.

// A single yes/no question about a picture or a sentence. The simplest
// comprehension check there is: "Is this a dog?" It reaches a child who cannot
// yet read a list of options, and it is the format most early-language goals
// are actually measured in.
export type YesNoElement = ElementBase & InteractiveAppearance & {
  type: "yesNo";
  prompt: string;
  imageSrc?: string;
  // The answer key. Kept explicit rather than inferred from the prompt so the
  // clinician can write the question however they like.
  answer: "yes" | "no";
  // What the two buttons say. Overridable because the same layout serves
  // "Yes / No", "Same / Different" and "👍 / 👎", which are the same task to
  // the child and different words to the clinician.
  yesLabel: string;
  noLabel: string;
};

export type Flashcard = {
  id: string;
  front: string;
  back: string;
  frontImage?: string;
  backImage?: string;
};

// A deck the child taps to flip, then marks for themselves. Not marked by the
// app: nothing here is typed or chosen, so there is nothing a computer can
// check — what it records is how many the child said they knew, which is the
// self-rating a clinician asks for anyway ("show me the ones that were hard").
//
// A deck rather than a page of questions is the point. One card at a time is
// the whole visual field, which is what makes it usable for a child who cannot
// scan a grid.
export type FlashcardsElement = ElementBase & InteractiveAppearance & {
  type: "flashcards";
  prompt: string;
  cards: Flashcard[];
};

// "How many?" — a row of the same picture repeated, and number buttons under
// it. Counting is the one early-cognitive skill none of the other types touch,
// and the interaction is a single tap on a big number.
export type CountTapElement = ElementBase & InteractiveAppearance & {
  type: "countTap";
  prompt: string;
  // What is being counted. An emoji is deliberately allowed and is the
  // default — a clinician can build a counting task with no upload at all.
  emoji: string;
  imageSrc?: string;
  // How many to draw, and therefore the answer.
  count: number;
  // The highest number offered as a choice. The buttons run 1..maxChoice.
  maxChoice: number;
};


// --- Puzzle and word-game tasks ----------------------------------------------
// The games a teletherapy session is actually built around. Each one is a
// task a clinician already runs on paper or with physical cards; what these
// add is that the app can mark them and record what happened.

// A letter grid with words hidden across and down. The grid itself is never
// stored — it is rebuilt deterministically from the element's own id, so the
// player and the answer key always agree and an attempt saved today can
// still be marked next year. See lib/canvas/word-search.ts.
export type WordSearchElement = ElementBase & InteractiveAppearance & {
  type: "wordSearch";
  prompt: string;
  words: string[];
  // Grid is size x size. Clamped to 4..14 when built: below four nothing
  // fits, and above fourteen the squares are too small to tap.
  size: number;
};

// One word to build out of tiles, and the tiles it breaks into.
export type TileWord = {
  id: string;
  word: string;
  // Shown while building, for a patient who cannot yet read the word from
  // memory. Optional — leaving it out makes the task harder on purpose.
  hint?: string;
};

// Scrambled letters to put back in order. Spelling, one word at a time.
export type UnscrambleElement = ElementBase & InteractiveAppearance & {
  type: "unscramble";
  prompt: string;
  words: TileWord[];
};

// The same tile mechanic at the level of syllables rather than letters, which
// is a different skill: "but-ter-fly" is phonological awareness, "b-u-t-t-e-r"
// is spelling, and a child can be fluent at one and not the other. Kept as
// its own type rather than a mode of unscramble so each can grow its own
// authoring controls.
export type ChunkWord = {
  id: string;
  word: string;
  chunks: string[];
};

export type WordChunksElement = ElementBase & InteractiveAppearance & {
  type: "wordChunks";
  prompt: string;
  items: ChunkWord[];
};


// One picture in the hunt. Emoji rather than an uploaded photo is a first-
// class option throughout: it needs no upload, no storage and no network,
// which is what lets a clinician build a task on a phone between sessions.
export type HuntItem = {
  id: string;
  label: string;
  emoji?: string;
  imageSrc?: string;
  isTarget: boolean;
};

// A grid of pictures, tap every one that matches. Unlike a picture-choice
// question, which has exactly one answer, this has several — and the errors
// are as informative as the hits, so wrong taps are subtracted.
export type PhotoHuntElement = ElementBase & InteractiveAppearance & {
  type: "photoHunt";
  prompt: string;
  columns: number;
  items: HuntItem[];
};

export type ComparisonRound = {
  id: string;
  question: string;
  a: { label: string; emoji?: string; imageSrc?: string };
  b: { label: string; emoji?: string; imageSrc?: string };
  answer: "a" | "b";
};

// Two things side by side, one question, two enormous targets: "which one is
// up?" Opposites and comparisons are early-concept work, and the format is
// the reason it reaches a child who cannot yet scan a list of four options.
export type SideBySideElement = ElementBase & InteractiveAppearance & {
  type: "sideBySide";
  prompt: string;
  rounds: ComparisonRound[];
};

// A hidden word revealed a letter at a time. The child taps letters and sees
// them appear in place — the classic guessing game, minus the hanging figure.
export type SecretWordElement = ElementBase & InteractiveAppearance & {
  type: "secretWord";
  prompt: string;
  word: string;
  hint: string;
  // How many wrong letters are allowed before the round is lost. Generous by
  // default: this is a vocabulary task, not a test of nerve.
  maxWrong: number;
};

// --- Worksheet elements -----------------------------------------------------
// Print-first building blocks. They carry no answer key and are never scored,
// which is what separates them from the interactive types above: a worksheet
// is filled in on paper, so the app has nothing to mark.

export type ListElement = ElementBase & {
  type: "list";
  ordered: boolean; // numbered when true, bulleted when false
  items: string[];
  fontSize: number;
  color: string;
  lineGap: number;
};

// Tick boxes down the page — a home-practice log, a session checklist, a
// consent form. Static like every worksheet element: the boxes are drawn
// empty and ticked with a pen, so there is nothing to score.
export type ChecklistElement = ElementBase & {
  type: "checklist";
  items: string[];
  fontSize: number;
  color: string;
  lineGap: number;
  boxSize: number;
};

// A ruled grid for anything a form collects in columns — dates against
// trials, a frequency tally, a home-practice record. rows[0] is the header
// when headerRow is true, so the shape stays one plain array of arrays
// rather than a header that has to be kept the same width as the body.
export type TableElement = ElementBase & {
  type: "table";
  rows: string[][];
  headerRow: boolean;
  fontSize: number;
  color: string;
  borderColor: string;
};

// Ruled lines for handwriting practice. Rendered as real lines rather than a
// background image so they stay crisp at any zoom and in print.
export type WritingLinesElement = ElementBase & {
  type: "writingLines";
  lines: number;
  lineGap: number;
  color: string;
  guide: "single" | "dotted-midline"; // dotted-midline = handwriting practice ruling
};

// A straight line, optionally with an arrowhead. The one piece of page
// furniture nothing else could stand in for: pointing at something, or
// connecting two things a clinician has laid out, previously meant drawing a
// very thin rectangle.
export type ArrowElement = ElementBase & {
  type: "arrow";
  color: string;
  thickness: number;
  head: "none" | "end" | "both";
};

// A horizontal rule across the page, for separating sections of a worksheet.
// Distinct from `arrow` because it is about structure rather than pointing,
// and it carries a style a rule wants and a pointer does not.
export type DividerElement = ElementBase & {
  type: "divider";
  color: string;
  thickness: number;
  style: "solid" | "dashed" | "dotted";
};

// A single large emoji. Sounds trivial; it is the cheapest way to put a
// recognisable picture on a page, and it needs no upload, no storage and no
// network — which matters for a clinician building a worksheet on a phone
// between sessions.
export type StickerElement = ElementBase & {
  type: "sticker";
  emoji: string;
};

// Text in a speech or thought bubble. Comic-strip social stories are a
// standard pragmatics tool, and they need a bubble that actually contains its
// own words — the existing speech-bubble shape is a background with no text.
export type SpeechBubbleElement = ElementBase & {
  type: "speechBubble";
  text: string;
  fontSize: number;
  color: string;
  fill: string;
  tail: "left" | "right" | "none";
  thought: boolean; // round scallops and dots, for what a character is thinking
};

// A tinted box with a heading, for the instruction to the adult running the
// sheet. Visually separated on purpose: the child should be able to tell at a
// glance which words on the page are not for them.
export type CalloutElement = ElementBase & {
  type: "callout";
  title: string;
  body: string;
  tone: "note" | "tip" | "warning";
  fontSize: number;
};

// Name and date rules across the top of a sheet. Every printed worksheet in
// every clinic has these, and drawing them by hand out of text elements and
// lines was several minutes of fiddling per sheet.
export type SheetHeaderElement = ElementBase & {
  type: "sheetHeader";
  fields: string[];
  fontSize: number;
  color: string;
};

// One box per character, for handwriting and spelling. `word` is the answer
// the child writes; `showLetters` prints it faintly for tracing, or leaves the
// boxes empty for recall.
export type LetterBoxesElement = ElementBase & {
  type: "letterBoxes";
  word: string;
  showLetters: boolean;
  boxSize: number;
  color: string;
};

// A ruled number line. Counting, number recognition and simple arithmetic all
// use one, and it has to be drawn to scale — which is exactly what a clinician
// cannot do by hand out of text boxes.
export type NumberLineElement = ElementBase & {
  type: "numberLine";
  from: number;
  to: number;
  step: number;
  color: string;
  fontSize: number;
};

// A row of stars to colour in as the child earns them. Token boards are one of
// the most-used pieces of paper in paediatric therapy, and there was no way to
// make one that did not involve drawing ten identical shapes by hand.
export type RewardStarsElement = ElementBase & {
  type: "rewardStars";
  total: number;
  earned: number;
  color: string;
  label: string;
};

// A boxed list of words to choose from when filling in blanks. Always
// unscored — it is the pool the answers come from, printed on the page.
export type WordBankElement = ElementBase & {
  type: "wordBank";
  title: string;
  words: string[];
  fontSize: number;
  color: string;
  borderColor: string;
};

export type CanvasElement =
  | TextElement
  | ImageElement
  | ShapeElement
  | AudioElement
  | ButtonElement
  | MultipleChoiceElement
  | FillBlankElement
  | DragMatchElement
  | SequenceElement
  | SortCategorizeElement
  | MemoryMatchElement
  | WordHuntElement
  | ImageHotspotsElement
  | PracticeDrillElement
  | DrawPadElement
  | LongAnswerElement
  | YesNoElement
  | FlashcardsElement
  | CountTapElement
  | WordSearchElement
  | UnscrambleElement
  | WordChunksElement
  | PhotoHuntElement
  | SideBySideElement
  | SecretWordElement
  | ListElement
  | WritingLinesElement
  | ChecklistElement
  | TableElement
  | ArrowElement
  | DividerElement
  | StickerElement
  | SpeechBubbleElement
  | CalloutElement
  | SheetHeaderElement
  | LetterBoxesElement
  | NumberLineElement
  | RewardStarsElement
  | WordBankElement;

export type CanvasElementType = CanvasElement["type"];

export const INTERACTIVE_TYPES: CanvasElementType[] = [
  "multipleChoice",
  "fillBlank",
  "dragMatch",
  "sequence",
  "sortCategorize",
  "memoryMatch",
  "wordHunt",
  "imageHotspots",
  "practiceDrill",
  "drawPad",
  "longAnswer",
  "yesNo",
  "flashcards",
  "countTap",
  "wordSearch",
  "unscramble",
  "wordChunks",
  "photoHunt",
  "sideBySide",
  "secretWord",
];

export function isInteractive(el: CanvasElement): boolean {
  return INTERACTIVE_TYPES.includes(el.type);
}

// Whether the page itself carries a ruling behind the elements. Optional so
// every canvas authored before worksheets existed still parses — absent means
// "blank", which is what those canvases already rendered as.
export const PAGE_STYLES = ["blank", "ruled", "ruled-margin", "grid", "dotted"] as const;
export type PageStyle = (typeof PAGE_STYLES)[number];

// Additional pages, 2..n. Page 1 stays in `elements`/`pageStyle` above, so
// every existing reader — the activity player, scoring, the printable report,
// the blueprints — keeps working untouched and simply sees the first page.
// Absent means a single-page document, which is what every canvas authored
// before multi-page was added is.
export type CanvasPage = {
  id: string;
  pageStyle: PageStyle;
  elements: CanvasElement[];
};

export type TemplateCanvas = {
  width: number;
  height: number;
  background: string;
  elements: CanvasElement[];
  pageStyle?: PageStyle;
  pages?: CanvasPage[];
};

// The whole document as a flat list of pages, page 1 first. The one place
// that knows how page 1 is stored differently from the rest, so nothing else
// has to remember.
export function allPages(canvas: TemplateCanvas): CanvasPage[] {
  return [
    { id: "page-1", pageStyle: canvas.pageStyle ?? "blank", elements: canvas.elements },
    ...(canvas.pages ?? []),
  ];
}

export const EMPTY_CANVAS: TemplateCanvas = {
  width: 900,
  height: 600,
  background: "#ffffff",
  elements: [],
};

// A4 at 96dpi in portrait — worksheets are authored at the size they print at,
// so what the author lays out is what comes out of the printer.
export const EMPTY_WORKSHEET_CANVAS: TemplateCanvas = {
  width: 794,
  height: 1123,
  background: "#ffffff",
  pageStyle: "blank",
  elements: [],
};

export const TEMPLATE_DOMAINS = [
  "Articulation",
  "Language",
  "Fluency",
  "Social / Pragmatics",
  "Cognitive",
  "OT / Fine Motor",
  "Behavioral",
  "General",
] as const;

export type TemplateDomain = (typeof TEMPLATE_DOMAINS)[number];

export const TEMPLATE_MEDIUMS = ["interactive", "hybrid", "print"] as const;
export type TemplateMedium = (typeof TEMPLATE_MEDIUMS)[number];
