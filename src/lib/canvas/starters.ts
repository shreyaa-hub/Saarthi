import type { TemplateCanvas, TemplateDomain, TemplateMedium } from "@/lib/types/canvas";

// A ready-made activity for every interactive task type, so somebody who has
// never used the canvas can pick one out of the library, see a working
// example, and change the words rather than start from an empty page.
//
// Shipped as code rather than seeded into the templates table, deliberately:
//
//   - templates.owner_id is NOT NULL and references a real profile, so a
//     seeded row would need a system user, which in turn needs an auth.users
//     row that a SQL migration cannot reliably create.
//   - These work on a completely fresh database with no setup at all, which
//     is the whole point — a new clinic should not have to be given a library
//     before the library is useful.
//   - Nobody can delete or edit them away, and they are version-controlled
//     and covered by tests like any other code.
//
// Importing one still produces an ordinary templates row owned by the
// importer (see importTemplate), so from that moment it behaves exactly like
// anything else in their library.
//
// The `starter__` prefix on the id is what tells the preview, import, play
// and print routes to look here instead of in the database. Ids are stable
// and must not be renamed — an imported copy is a real row and unaffected,
// but a stale id in a bookmarked preview link would 404.
//
// Every character is URL-safe on purpose. A colon read better and cost a
// morning: these ids travel in the path of /library/try/<id> and
// /print/template/<id>, and this version of Next hands the route param back
// still percent-encoded, so "starter:x" arrived as "starter%3Ax" and every
// starter 404ed. An id with nothing to encode cannot be mangled, whichever
// way the framework decides to hand params over.
export const STARTER_ID_PREFIX = "starter__";

export function isStarterId(id: string): boolean {
  return id.startsWith(STARTER_ID_PREFIX);
}

export type StarterTemplate = {
  id: string;
  title: string;
  description: string;
  domain: TemplateDomain;
  medium: TemplateMedium;
  thumbnailColor: string;
  canvas: TemplateCanvas;
};

// Every starter is laid out on the same canvas with the same title block, so
// they read as a set and a clinician who opens a second one already knows
// where things are.
const W = 900;
const H = 600;

function canvas(
  heading: string,
  element: TemplateCanvas["elements"][number],
  extra: TemplateCanvas["elements"] = [],
): TemplateCanvas {
  return {
    width: W,
    height: H,
    background: "#ffffff",
    elements: [
      {
        id: "title",
        type: "text",
        x: 60,
        y: 40,
        w: 780,
        h: 48,
        content: heading,
        fontSize: 30,
        fontWeight: "bold",
        color: "#2a2420",
        align: "left",
      },
      element,
      ...extra,
    ],
  };
}

export const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    id: `${STARTER_ID_PREFIX}multipleChoice`,
    title: "Starter · Picture choice",
    description:
      "Four pictures side by side and one question. Swap in your own photos and tick the right one.",
    domain: "Language",
    medium: "interactive",
    thumbnailColor: "#7c3aed",
    canvas: canvas("Point to the right one", {
      id: "mc",
      type: "multipleChoice",
      x: 60,
      y: 120,
      w: 780,
      h: 300,
      prompt: "Which one is the animal?",
      allowMultiple: false,
      layout: "grid",
      columns: 4,
      imageSize: 110,
      options: [
        { id: "o1", label: "🐶 Dog", correct: true },
        { id: "o2", label: "🍎 Apple", correct: false },
        { id: "o3", label: "🚗 Car", correct: false },
        { id: "o4", label: "⚽ Ball", correct: false },
      ],
    }),
  },
  {
    id: `${STARTER_ID_PREFIX}yesNo`,
    title: "Starter · Yes or no",
    description:
      "One question, two big buttons. The simplest comprehension check there is — good for a very young child.",
    domain: "Language",
    medium: "interactive",
    thumbnailColor: "#0ea5e9",
    canvas: canvas("Yes or no?", {
      id: "yn",
      type: "yesNo",
      x: 60,
      y: 130,
      w: 500,
      h: 220,
      prompt: "Is a banana yellow?",
      answer: "yes",
      yesLabel: "Yes",
      noLabel: "No",
      fontSize: 20,
    }),
  },
  {
    id: `${STARTER_ID_PREFIX}dragMatch`,
    title: "Starter · Drag to match",
    description:
      "Match each word to its pair. Add a photo to either side to turn it into picture matching.",
    domain: "Language",
    medium: "interactive",
    thumbnailColor: "#f59e0b",
    canvas: canvas("Match the pairs", {
      id: "dm",
      type: "dragMatch",
      x: 60,
      y: 120,
      w: 600,
      h: 300,
      prompt: "Match each animal to the sound it makes.",
      fontSize: 18,
      pairs: [
        { id: "p1", left: "🐶 Dog", right: "Woof" },
        { id: "p2", left: "🐱 Cat", right: "Meow" },
        { id: "p3", left: "🐄 Cow", right: "Moo" },
        { id: "p4", left: "🦆 Duck", right: "Quack" },
      ],
    }),
  },
  {
    id: `${STARTER_ID_PREFIX}sortCategorize`,
    title: "Starter · Sort into categories",
    description:
      "Drag each item into the right group. Add a third category, or photos, from the panel.",
    domain: "Cognitive",
    medium: "interactive",
    thumbnailColor: "#10b981",
    canvas: canvas("Sort them out", {
      id: "sc",
      type: "sortCategorize",
      x: 60,
      y: 120,
      w: 780,
      h: 320,
      prompt: "Put each one where it belongs.",
      fontSize: 18,
      categories: [
        { id: "c1", label: "Animals" },
        { id: "c2", label: "Food" },
      ],
      items: [
        { id: "i1", label: "🐶 Dog", categoryId: "c1" },
        { id: "i2", label: "🍎 Apple", categoryId: "c2" },
        { id: "i3", label: "🐱 Cat", categoryId: "c1" },
        { id: "i4", label: "🍌 Banana", categoryId: "c2" },
      ],
    }),
  },
  {
    id: `${STARTER_ID_PREFIX}sequence`,
    title: "Starter · Put it in order",
    description:
      "Tap the steps in the right order. The patient always sees them shuffled. Add photos for picture sequencing.",
    domain: "Cognitive",
    medium: "interactive",
    thumbnailColor: "#8b5cf6",
    canvas: canvas("What comes first?", {
      id: "sq",
      type: "sequence",
      x: 60,
      y: 120,
      w: 600,
      h: 320,
      prompt: "Put the morning routine in order.",
      fontSize: 18,
      items: [
        { id: "s1", label: "Wake up", order: 1 },
        { id: "s2", label: "Brush teeth", order: 2 },
        { id: "s3", label: "Get dressed", order: 3 },
        { id: "s4", label: "Eat breakfast", order: 4 },
      ],
    }),
  },
  {
    id: `${STARTER_ID_PREFIX}memoryMatch`,
    title: "Starter · Memory match",
    description:
      "Face-down cards to pair up. Fill in the second card of a pair to match a picture to its word.",
    domain: "Cognitive",
    medium: "interactive",
    thumbnailColor: "#ec4899",
    canvas: canvas("Find the pairs", {
      id: "mm",
      type: "memoryMatch",
      x: 60,
      y: 120,
      w: 700,
      h: 360,
      prompt: "Turn over two cards to find a matching pair.",
      fontSize: 16,
      pairs: [
        { id: "m1", label: "🐶", labelB: "Dog" },
        { id: "m2", label: "🐱", labelB: "Cat" },
        { id: "m3", label: "🍎", labelB: "Apple" },
      ],
    }),
  },
  {
    id: `${STARTER_ID_PREFIX}countTap`,
    title: "Starter · How many?",
    description: "Count the pictures and tap the number. Change what is counted to any emoji or photo.",
    domain: "Cognitive",
    medium: "interactive",
    thumbnailColor: "#f97316",
    canvas: canvas("Count them", {
      id: "ct",
      type: "countTap",
      x: 60,
      y: 130,
      w: 600,
      h: 280,
      prompt: "How many apples are there?",
      emoji: "🍎",
      count: 4,
      maxChoice: 6,
      fontSize: 20,
    }),
  },
  {
    id: `${STARTER_ID_PREFIX}flashcards`,
    title: "Starter · Flashcards",
    description:
      "A deck to flip through, one card at a time. The child says whether they knew it — nothing is marked.",
    domain: "Articulation",
    medium: "interactive",
    thumbnailColor: "#06b6d4",
    canvas: canvas("Flip and say", {
      id: "fc",
      type: "flashcards",
      x: 60,
      y: 120,
      w: 500,
      h: 380,
      prompt: "Say the word, then turn the card over.",
      fontSize: 18,
      cards: [
        { id: "f1", front: "Sun", back: "☀️" },
        { id: "f2", front: "Soap", back: "🧼" },
        { id: "f3", front: "Sock", back: "🧦" },
      ],
    }),
  },
  {
    id: `${STARTER_ID_PREFIX}practiceDrill`,
    title: "Starter · Practice drill",
    description:
      "Say each word a set number of times, tapping once per try. Articulation homework, counted.",
    domain: "Articulation",
    medium: "interactive",
    thumbnailColor: "#ef4444",
    canvas: canvas("Say it five times", {
      id: "pd",
      type: "practiceDrill",
      x: 60,
      y: 120,
      w: 600,
      h: 320,
      prompt: "Say each word five times. Tap once for every try.",
      fontSize: 18,
      words: [
        { id: "w1", label: "Sun", target: 5 },
        { id: "w2", label: "Soap", target: 5 },
        { id: "w3", label: "Sock", target: 5 },
      ],
    }),
  },
  {
    id: `${STARTER_ID_PREFIX}wordHunt`,
    title: "Starter · Word hunt",
    description:
      "Tap every word with the target sound. Paste in your own passage and list the words to find.",
    domain: "Articulation",
    medium: "interactive",
    thumbnailColor: "#84cc16",
    canvas: canvas("Find the sound", {
      id: "wh",
      type: "wordHunt",
      x: 60,
      y: 120,
      w: 780,
      h: 260,
      prompt: "Tap every word that starts with the /s/ sound.",
      fontSize: 20,
      passage:
        "The sun was so bright that Sam put on his sunglasses before he sat on the soft grass.",
      targetWords: ["sun", "so", "Sam", "sunglasses", "sat", "soft"],
    }),
  },
  {
    id: `${STARTER_ID_PREFIX}fillBlank`,
    title: "Starter · Fill in the blank",
    description: "One sentence with a gap to type into. Use ___ anywhere in the sentence to mark the gap.",
    domain: "Language",
    medium: "interactive",
    thumbnailColor: "#14b8a6",
    canvas: canvas("Finish the sentence", {
      id: "fb",
      type: "fillBlank",
      x: 60,
      y: 140,
      w: 700,
      h: 140,
      template: "The cat is ___ the box.",
      answer: "in",
      caseSensitive: false,
      fontSize: 24,
    }),
  },
  {
    id: `${STARTER_ID_PREFIX}imageHotspots`,
    title: "Starter · Find it in the picture",
    description:
      "Upload a busy scene, then drag a box over each thing to find. Add your picture first — this one ships empty on purpose.",
    domain: "Language",
    medium: "interactive",
    thumbnailColor: "#a855f7",
    canvas: canvas(
      "Find it in the picture",
      {
        id: "ih",
        type: "imageHotspots",
        x: 60,
        y: 170,
        w: 600,
        h: 360,
        prompt: "Find and tap each thing in the picture.",
        src: "",
        alt: "",
        showOutlines: false,
        fit: "contain",
        fontSize: 18,
        hotspots: [{ id: "h1", label: "Target 1", xPct: 35, yPct: 35, wPct: 25, hPct: 25 }],
      },
      [
        {
          id: "note",
          type: "callout",
          x: 60,
          y: 96,
          w: 600,
          h: 64,
          title: "Add a picture first",
          body: "Select the activity, upload a photo, then drag the box over what you want found.",
          tone: "tip",
          fontSize: 14,
        },
      ],
    ),
  },
  {
    id: `${STARTER_ID_PREFIX}drawPad`,
    title: "Starter · Draw or trace",
    description:
      "A pad to draw on with a finger. Put a letter or shape behind it to turn free drawing into tracing.",
    domain: "OT / Fine Motor",
    medium: "interactive",
    thumbnailColor: "#f43f5e",
    canvas: canvas("Draw it", {
      id: "dp",
      type: "drawPad",
      x: 60,
      y: 120,
      w: 640,
      h: 380,
      prompt: "Draw a big circle.",
      strokeColor: "#2a2420",
      strokeWidth: 6,
      fontSize: 18,
    }),
  },
  {
    id: `${STARTER_ID_PREFIX}longAnswer`,
    title: "Starter · Written answer",
    description:
      "An open box for a sentence or a story. Nothing is marked right or wrong — set how many words count as done.",
    domain: "Language",
    medium: "interactive",
    thumbnailColor: "#6366f1",
    canvas: canvas("Tell me about it", {
      id: "la",
      type: "longAnswer",
      x: 60,
      y: 120,
      w: 700,
      h: 320,
      prompt: "Tell me what happened in the story.",
      placeholder: "Write your answer here…",
      minWords: 10,
      lines: 6,
      fontSize: 18,
    }),
  },
  {
    id: `${STARTER_ID_PREFIX}worksheet`,
    title: "Starter · Printable home practice",
    description:
      "A ready-to-print sheet with a name line, a note for the grown-up, writing lines and a star chart.",
    domain: "General",
    medium: "print",
    thumbnailColor: "#0891b2",
    canvas: {
      // A4 at 96dpi, so what is laid out here is exactly what comes out of
      // the printer — see PrintableCanvas.
      width: 794,
      height: 1123,
      background: "#ffffff",
      pageStyle: "blank",
      elements: [
        {
          id: "t", type: "text", x: 48, y: 40, w: 700, h: 44,
          content: "Home practice", fontSize: 30, fontWeight: "bold", color: "#2a2420", align: "left",
        },
        {
          id: "hd", type: "sheetHeader", x: 48, y: 96, w: 700, h: 44,
          fields: ["Name", "Date"], fontSize: 16, color: "#2a2420",
        },
        {
          id: "dv", type: "divider", x: 48, y: 148, w: 700, h: 20,
          color: "#c9bfae", thickness: 2, style: "solid",
        },
        {
          id: "co", type: "callout", x: 48, y: 178, w: 700, h: 84,
          title: "For the grown-up",
          body: "Say each word first and let them copy you. Five minutes a day is plenty.",
          tone: "tip", fontSize: 15,
        },
        {
          id: "wb", type: "wordBank", x: 48, y: 286, w: 700, h: 110,
          title: "This week's words",
          words: ["sun", "soap", "sock", "sand", "seed"],
          fontSize: 18, color: "#2a2420", borderColor: "#c9bfae",
        },
        {
          id: "lb", type: "letterBoxes", x: 48, y: 420, w: 700, h: 60,
          word: "sun", showLetters: true, boxSize: 46, color: "#2a2420",
        },
        {
          id: "wl", type: "writingLines", x: 48, y: 500, w: 700, h: 200,
          lines: 5, lineGap: 38, color: "#c9bfae", guide: "dotted-midline",
        },
        {
          id: "tb", type: "table", x: 48, y: 720, w: 700, h: 200,
          headerRow: true,
          rows: [
            ["Day", "Practised", "Notes"],
            ["Monday", "", ""],
            ["Tuesday", "", ""],
            ["Wednesday", "", ""],
            ["Thursday", "", ""],
            ["Friday", "", ""],
          ],
          fontSize: 15, color: "#2a2420", borderColor: "#c9bfae",
        },
        {
          id: "rs", type: "rewardStars", x: 48, y: 950, w: 500, h: 80,
          total: 5, earned: 0, color: "#7c3aed", label: "A star for every day you practise",
        },
      ],
    },
  },
];

export function getStarter(id: string): StarterTemplate | null {
  return STARTER_TEMPLATES.find((s) => s.id === id) ?? null;
}

// The starter list in the shape the library grid already renders, so the
// cards need no special case — only the id prefix distinguishes them, and
// only the routes that fetch a canvas care about that.
export function starterLibraryRows(medium?: TemplateMedium) {
  return STARTER_TEMPLATES.filter((s) => !medium || s.medium === medium).map((s) => ({
    id: s.id,
    title: s.title,
    domain: s.domain as string,
    medium: s.medium as string,
    thumbnail_color: s.thumbnailColor,
    updated_at: new Date(0).toISOString(),
  }));
}
