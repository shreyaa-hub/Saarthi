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

// A4 at 96dpi, so what is laid out here is exactly what comes out of the
// printer — see PrintableCanvas. Every printable starter shares the same top
// block (title, name/date rules, a divider) so a clinic's sheets look like a
// set rather than a pile of unrelated documents.
const SHEET_W = 794;
const SHEET_H = 1123;

function sheet(
  heading: string,
  fields: string[],
  body: TemplateCanvas["elements"],
): TemplateCanvas {
  return {
    width: SHEET_W,
    height: SHEET_H,
    background: "#ffffff",
    pageStyle: "blank",
    elements: [
      {
        id: "sheet-title", type: "text", x: 48, y: 36, w: 700, h: 44,
        content: heading, fontSize: 28, fontWeight: "bold", color: "#2a2420", align: "left",
      },
      {
        id: "sheet-fields", type: "sheetHeader", x: 48, y: 92, w: 700, h: 44,
        fields, fontSize: 15, color: "#2a2420",
      },
      {
        id: "sheet-rule", type: "divider", x: 48, y: 144, w: 700, h: 18,
        color: "#c9bfae", thickness: 2, style: "solid",
      },
      ...body,
    ],
  };
}

// A ready-to-use activity rather than a demonstration of one element type:
// several elements laid out together the way a clinician would actually
// build a session task. The type demos above answer "what does a drag-match
// look like"; these answer "what does a session on following directions look
// like", which is the question somebody opening the library is really asking.
function activity(heading: string, body: TemplateCanvas["elements"]): TemplateCanvas {
  return {
    width: W,
    height: H,
    background: "#ffffff",
    elements: [
      {
        id: "title", type: "text", x: 60, y: 36, w: 780, h: 44,
        content: heading, fontSize: 28, fontWeight: "bold", color: "#2a2420", align: "left",
      },
      ...body,
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
    id: `${STARTER_ID_PREFIX}wordSearch`,
    title: "Starter · Word search",
    description:
      "A letter grid with words hidden across and down. Tap the first letter of a word, then the last.",
    domain: "Language",
    medium: "interactive",
    thumbnailColor: "#0d9488",
    canvas: canvas("Find the words", {
      id: "ws",
      type: "wordSearch",
      x: 60,
      y: 110,
      w: 480,
      h: 440,
      prompt: "Find each word in the grid.",
      words: ["sun", "sock", "soap", "sand"],
      size: 8,
      fontSize: 15,
    }),
  },
  {
    id: `${STARTER_ID_PREFIX}unscramble`,
    title: "Starter · Unscramble",
    description:
      "Letters in the wrong order to put right. Tap the tiles to build the word; tap again to take one back.",
    domain: "Language",
    medium: "interactive",
    thumbnailColor: "#d97706",
    canvas: canvas("Put the letters in order", {
      id: "un",
      type: "unscramble",
      x: 60,
      y: 110,
      w: 520,
      h: 380,
      prompt: "Unscramble each word.",
      fontSize: 18,
      words: [
        { id: "u1", word: "sun", hint: "It shines in the sky" },
        { id: "u2", word: "cat", hint: "It says meow" },
        { id: "u3", word: "hand", hint: "You have two" },
      ],
    }),
  },
  {
    id: `${STARTER_ID_PREFIX}wordChunks`,
    title: "Starter · Word chunks",
    description:
      "Build a word out of its syllables. Phonological awareness rather than spelling — a different skill.",
    domain: "Language",
    medium: "interactive",
    thumbnailColor: "#4f46e5",
    canvas: canvas("Build the word", {
      id: "wc",
      type: "wordChunks",
      x: 60,
      y: 110,
      w: 520,
      h: 380,
      prompt: "Put the chunks together.",
      fontSize: 18,
      items: [
        { id: "k1", word: "butterfly", chunks: ["but", "ter", "fly"] },
        { id: "k2", word: "rainbow", chunks: ["rain", "bow"] },
        { id: "k3", word: "banana", chunks: ["ba", "na", "na"] },
      ],
    }),
  },

  {
    id: `${STARTER_ID_PREFIX}photoHunt`,
    title: "Starter · Photo hunt",
    description:
      "A grid of pictures — tap every one that matches. Several right answers, unlike a picture-choice question.",
    domain: "Language",
    medium: "interactive",
    thumbnailColor: "#059669",
    canvas: canvas("Find them all", {
      id: "ph",
      type: "photoHunt",
      x: 60,
      y: 110,
      w: 780,
      h: 400,
      prompt: "Tap every animal.",
      columns: 4,
      imageSize: 56,
      fontSize: 16,
      items: [
        { id: "h1", label: "Dog", emoji: "🐶", isTarget: true },
        { id: "h2", label: "Apple", emoji: "🍎", isTarget: false },
        { id: "h3", label: "Cat", emoji: "🐱", isTarget: true },
        { id: "h4", label: "Car", emoji: "🚗", isTarget: false },
        { id: "h5", label: "Cow", emoji: "🐄", isTarget: true },
        { id: "h6", label: "Ball", emoji: "⚽", isTarget: false },
        { id: "h7", label: "Duck", emoji: "🦆", isTarget: true },
        { id: "h8", label: "Hat", emoji: "🎩", isTarget: false },
      ],
    }),
  },
  {
    id: `${STARTER_ID_PREFIX}sideBySide`,
    title: "Starter · Side by side",
    description:
      "Two things, one question, two big targets. Opposites and comparisons for early concept work.",
    domain: "Cognitive",
    medium: "interactive",
    thumbnailColor: "#0284c7",
    canvas: canvas("This one or that one?", {
      id: "sbs",
      type: "sideBySide",
      x: 60,
      y: 110,
      w: 600,
      h: 420,
      prompt: "Point to the right one.",
      imageSize: 44,
      fontSize: 18,
      rounds: [
        {
          id: "r1", question: "Which one is up?",
          a: { label: "Up", emoji: "⬆️" }, b: { label: "Down", emoji: "⬇️" }, answer: "a",
        },
        {
          id: "r2", question: "Which one is big?",
          a: { label: "Mouse", emoji: "🐭" }, b: { label: "Elephant", emoji: "🐘" }, answer: "b",
        },
        {
          id: "r3", question: "Which one is hot?",
          a: { label: "Sun", emoji: "☀️" }, b: { label: "Snow", emoji: "❄️" }, answer: "a",
        },
      ],
    }),
  },
  {
    id: `${STARTER_ID_PREFIX}secretWord`,
    title: "Starter · Secret word",
    description:
      "A hidden word revealed a letter at a time. Running out of guesses shows the word rather than ending the game.",
    domain: "Language",
    medium: "interactive",
    thumbnailColor: "#c026d3",
    canvas: canvas("What is the secret word?", {
      id: "sw",
      type: "secretWord",
      x: 60,
      y: 110,
      w: 640,
      h: 400,
      prompt: "Guess the letters to find the word.",
      word: "rainbow",
      hint: "You see it after the rain",
      maxWrong: 6,
      fontSize: 18,
    }),
  },

  {
    id: `${STARTER_ID_PREFIX}storyTime`,
    title: "Starter · Story time",
    description:
      "A picture book turned one page at a time. Nothing is marked — what is recorded is how far the child read.",
    domain: "Language",
    medium: "interactive",
    thumbnailColor: "#a16207",
    canvas: canvas("Story time", {
      id: "st",
      type: "storyTime",
      x: 60,
      y: 110,
      w: 620,
      h: 430,
      title: "The dog and the ball",
      imageSize: 40,
      fontSize: 18,
      pages: [
        { id: "sp1", text: "The dog found a ball.", emoji: "🐶" },
        { id: "sp2", text: "He ran all the way to the park.", emoji: "🌳" },
        { id: "sp3", text: "Oh no — the ball went in the pond!", emoji: "💦" },
        { id: "sp4", text: "A girl helped him get it back.", emoji: "🙂" },
      ],
    }),
  },
  {
    id: `${STARTER_ID_PREFIX}puzzle`,
    title: "Starter · Puzzle",
    description:
      "A picture cut into nine and shuffled. Tap two pieces to swap them — no dragging needed.",
    domain: "Cognitive",
    medium: "interactive",
    thumbnailColor: "#7e22ce",
    canvas: canvas("Put it back together", {
      id: "pz",
      type: "puzzle",
      x: 60,
      y: 110,
      w: 420,
      h: 460,
      prompt: "Put the picture back together.",
      emoji: "🦋",
      rows: 3,
      cols: 3,
      fontSize: 16,
    }),
  },
  {
    id: `${STARTER_ID_PREFIX}traceGame`,
    title: "Starter · Trace it",
    description:
      "A big letter to trace over with a finger. Change the letter to any character you are working on.",
    domain: "OT / Fine Motor",
    medium: "interactive",
    thumbnailColor: "#be123c",
    canvas: canvas("Trace the letter", {
      id: "tg",
      type: "traceGame",
      x: 60,
      y: 110,
      w: 440,
      h: 440,
      prompt: "Trace the letter with your finger.",
      glyph: "S",
      strokeColor: "#7c3aed",
      strokeWidth: 12,
      coverage: 0.2,
      fontSize: 16,
    }),
  },
  {
    id: `${STARTER_ID_PREFIX}battleTime`,
    title: "Starter · Battle time",
    description:
      "Two teams taking turns to turn over a card for points. A reward game for the end of a hard session.",
    domain: "Behavioral",
    medium: "interactive",
    thumbnailColor: "#dc2626",
    canvas: canvas("Battle time", {
      id: "bt",
      type: "battleTime",
      x: 60,
      y: 110,
      w: 620,
      h: 430,
      prompt: "Take turns. Tap a card to see what you win.",
      teamA: "Me",
      teamB: "You",
      fontSize: 16,
      cards: [
        { id: "b1", label: "⭐", points: 1 },
        { id: "b2", label: "⭐⭐", points: 2 },
        { id: "b3", label: "💎", points: 3 },
        { id: "b4", label: "⭐", points: 1 },
        { id: "b5", label: "🎉", points: 5 },
        { id: "b6", label: "⭐⭐", points: 2 },
      ],
    }),
  },

  // --- Ready-to-use activities -----------------------------------------------
  // Not demonstrations of an element type — whole session tasks, each built
  // from several elements the way a clinician actually assembles one.

  {
    id: `${STARTER_ID_PREFIX}followingDirections`,
    title: "Activity · Following directions",
    description:
      "Two-step directions to put in order, then a comprehension check. A staple of early receptive-language work.",
    domain: "Language",
    medium: "interactive",
    thumbnailColor: "#7c3aed",
    canvas: activity("Do what it says", [
      {
        id: "seq", type: "sequence", x: 60, y: 110, w: 400, h: 300,
        prompt: "Put the steps in the order I said them.", fontSize: 18,
        items: [
          { id: "d1", label: "Touch your nose", order: 1 },
          { id: "d2", label: "Clap your hands", order: 2 },
          { id: "d3", label: "Stand up", order: 3 },
        ],
      },
      {
        id: "check", type: "yesNo", x: 490, y: 110, w: 350, h: 230,
        prompt: "Did you clap before you stood up?",
        answer: "yes", yesLabel: "Yes", noLabel: "No", fontSize: 18,
      },
      {
        id: "note", type: "callout", x: 490, y: 360, w: 350, h: 120,
        title: "For the grown-up",
        body: "Say the whole instruction once, then wait. Do not repeat it until they have tried.",
        tone: "tip", fontSize: 14,
      },
    ]),
  },
  {
    id: `${STARTER_ID_PREFIX}articulationS`,
    title: "Activity · /s/ sound practice",
    description:
      "A repetition drill and a flashcard deck for the /s/ sound. Change the words for any target sound.",
    domain: "Articulation",
    medium: "interactive",
    thumbnailColor: "#ef4444",
    canvas: activity("Practise the /s/ sound", [
      {
        id: "drill", type: "practiceDrill", x: 60, y: 110, w: 400, h: 300,
        prompt: "Say each word five times. Tap once for every try.", fontSize: 17,
        words: [
          { id: "a1", label: "Sun", target: 5 },
          { id: "a2", label: "Soap", target: 5 },
          { id: "a3", label: "Sock", target: 5 },
        ],
      },
      {
        id: "cards", type: "flashcards", x: 490, y: 110, w: 350, h: 380,
        prompt: "Say the word, then turn the card over.", fontSize: 17,
        cards: [
          { id: "c1", front: "Sun", back: "☀️" },
          { id: "c2", front: "Soap", back: "🧼" },
          { id: "c3", front: "Sock", back: "🧦" },
          { id: "c4", front: "Sand", back: "🏖️" },
        ],
      },
      {
        id: "stars", type: "rewardStars", x: 60, y: 430, w: 400, h: 70,
        total: 5, earned: 0, color: "#7c3aed", label: "A star for every word you finish",
      },
    ]),
  },
  {
    id: `${STARTER_ID_PREFIX}storyRetell`,
    title: "Activity · Retell the story",
    description:
      "Put the story in order, then tell it back in your own words. Narrative language, start to finish.",
    domain: "Language",
    medium: "interactive",
    thumbnailColor: "#8b5cf6",
    canvas: activity("Tell me the story", [
      {
        id: "order", type: "sequence", x: 60, y: 110, w: 380, h: 290,
        prompt: "Put the story in order.", fontSize: 17,
        items: [
          { id: "t1", label: "The dog found a ball", order: 1 },
          { id: "t2", label: "He ran to the park", order: 2 },
          { id: "t3", label: "The ball went in the pond", order: 3 },
          { id: "t4", label: "A girl helped him get it", order: 4 },
        ],
      },
      {
        id: "tell", type: "longAnswer", x: 470, y: 110, w: 370, h: 340,
        prompt: "Now tell the story in your own words.",
        placeholder: "Start with what happened first…",
        minWords: 15, lines: 7, fontSize: 17,
      },
      {
        id: "hint", type: "callout", x: 60, y: 420, w: 380, h: 90,
        title: "Prompt if they stall",
        body: "“What happened first? … and then?”",
        tone: "note", fontSize: 14,
      },
    ]),
  },
  {
    id: `${STARTER_ID_PREFIX}feelings`,
    title: "Activity · How are they feeling?",
    description:
      "Read a face, then judge a situation. Emotion recognition for social and pragmatic goals.",
    domain: "Social / Pragmatics",
    medium: "interactive",
    thumbnailColor: "#ec4899",
    canvas: activity("How are they feeling?", [
      {
        id: "face", type: "multipleChoice", x: 60, y: 110, w: 780, h: 220,
        prompt: "Which face is sad?", allowMultiple: false,
        layout: "grid", columns: 4, imageSize: 80, fontSize: 17,
        options: [
          { id: "f1", label: "😀 Happy", correct: false },
          { id: "f2", label: "😢 Sad", correct: true },
          { id: "f3", label: "😡 Cross", correct: false },
          { id: "f4", label: "😲 Surprised", correct: false },
        ],
      },
      {
        id: "why", type: "yesNo", x: 60, y: 350, w: 380, h: 200,
        prompt: "Their ice cream fell on the floor. Would they feel sad?",
        answer: "yes", yesLabel: "Yes", noLabel: "No", fontSize: 17,
      },
      {
        id: "say", type: "longAnswer", x: 470, y: 350, w: 370, h: 200,
        prompt: "What could you say to help them feel better?",
        placeholder: "You could say…", minWords: 3, lines: 3, fontSize: 17,
      },
    ]),
  },
  {
    id: `${STARTER_ID_PREFIX}prepositions`,
    title: "Activity · Where is it?",
    description:
      "In, on, under, behind — a word bank to choose from, a sentence to finish, and a picture question.",
    domain: "Language",
    medium: "interactive",
    thumbnailColor: "#14b8a6",
    canvas: activity("Where is it?", [
      {
        id: "bank", type: "wordBank", x: 60, y: 110, w: 300, h: 150,
        title: "Choose a word", words: ["in", "on", "under", "behind"],
        fontSize: 18, color: "#2a2420", borderColor: "#c9bfae",
      },
      {
        id: "gap", type: "fillBlank", x: 400, y: 110, w: 440, h: 150,
        template: "The cat is ___ the box.", answer: "in", caseSensitive: false, fontSize: 22,
      },
      {
        id: "pick", type: "multipleChoice", x: 60, y: 290, w: 780, h: 230,
        prompt: "The ball is under the chair. Which picture is right?",
        allowMultiple: false, layout: "grid", columns: 3, imageSize: 80, fontSize: 17,
        options: [
          { id: "p1", label: "Ball on the chair", correct: false },
          { id: "p2", label: "Ball under the chair", correct: true },
          { id: "p3", label: "Ball behind the chair", correct: false },
        ],
      },
    ]),
  },
  {
    id: `${STARTER_ID_PREFIX}earlyCounting`,
    title: "Activity · Counting to five",
    description:
      "Count two groups and find the number on a number line. Early maths and number recognition.",
    domain: "Cognitive",
    medium: "interactive",
    thumbnailColor: "#f97316",
    canvas: activity("Let's count", [
      {
        id: "count1", type: "countTap", x: 60, y: 110, w: 380, h: 250,
        prompt: "How many apples?", emoji: "🍎", count: 3, maxChoice: 5, fontSize: 18,
      },
      {
        id: "count2", type: "countTap", x: 460, y: 110, w: 380, h: 250,
        prompt: "How many stars?", emoji: "⭐", count: 5, maxChoice: 5, fontSize: 18,
      },
      {
        id: "line", type: "numberLine", x: 60, y: 390, w: 780, h: 80,
        from: 0, to: 5, step: 1, color: "#2a2420", fontSize: 16,
      },
      {
        id: "hint2", type: "text", x: 60, y: 480, w: 780, h: 40,
        content: "Point to each number as you count out loud.",
        fontSize: 16, fontWeight: "normal", color: "#6b6257", align: "left",
      },
    ]),
  },


  {
    id: `${STARTER_ID_PREFIX}spellingPractice`,
    title: "Activity · Spelling practice",
    description:
      "The same four words twice over — unscramble them, then find them hidden in a grid. Recognition after recall.",
    domain: "Language",
    medium: "interactive",
    thumbnailColor: "#0d9488",
    canvas: activity("This week's words", [
      {
        id: "sp-un", type: "unscramble", x: 60, y: 106, w: 380, h: 300,
        prompt: "Put the letters in order.", fontSize: 17,
        words: [
          { id: "sw1", word: "sun", hint: "It shines in the sky" },
          { id: "sw2", word: "sock", hint: "It goes on your foot" },
          { id: "sw3", word: "sand", hint: "You find it at the beach" },
        ],
      },
      {
        id: "sp-ws", type: "wordSearch", x: 470, y: 106, w: 370, h: 440,
        prompt: "Now find the same words in the grid.",
        words: ["sun", "sock", "sand", "soap"], size: 8, fontSize: 14,
      },
      {
        id: "sp-note", type: "callout", x: 60, y: 426, w: 380, h: 110,
        title: "For the grown-up",
        body: "Say each word out loud before they build it. Spelling follows hearing.",
        tone: "tip", fontSize: 14,
      },
    ]),
  },
  {
    id: `${STARTER_ID_PREFIX}syllableClapping`,
    title: "Activity · Clap the syllables",
    description:
      "Build words from their chunks, then say each one with a clap per syllable. Phonological awareness, out loud.",
    domain: "Articulation",
    medium: "interactive",
    thumbnailColor: "#4f46e5",
    canvas: activity("Clap it out", [
      {
        id: "sc-wc", type: "wordChunks", x: 60, y: 106, w: 400, h: 320,
        prompt: "Put the chunks together to build the word.", fontSize: 17,
        items: [
          { id: "sc1", word: "butterfly", chunks: ["but", "ter", "fly"] },
          { id: "sc2", word: "banana", chunks: ["ba", "na", "na"] },
          { id: "sc3", word: "rainbow", chunks: ["rain", "bow"] },
        ],
      },
      {
        id: "sc-drill", type: "practiceDrill", x: 490, y: 106, w: 350, h: 320,
        prompt: "Say each word with a clap for every chunk.", fontSize: 16,
        words: [
          { id: "sd1", label: "but-ter-fly", target: 3 },
          { id: "sd2", label: "ba-na-na", target: 3 },
          { id: "sd3", label: "rain-bow", target: 3 },
        ],
      },
      {
        id: "sc-stars", type: "rewardStars", x: 60, y: 446, w: 400, h: 80,
        total: 3, earned: 0, color: "#4f46e5", label: "A star for every word",
      },
    ]),
  },
  {
    id: `${STARTER_ID_PREFIX}vocabularyHunt`,
    title: "Activity · Find the animals",
    description:
      "Pick every animal out of a mixed grid, then answer a comparison about them. Category knowledge two ways.",
    domain: "Language",
    medium: "interactive",
    thumbnailColor: "#059669",
    canvas: activity("Animals everywhere", [
      {
        id: "vh-hunt", type: "photoHunt", x: 60, y: 106, w: 780, h: 230,
        prompt: "Tap every animal.", columns: 4, imageSize: 44, fontSize: 15,
        items: [
          { id: "vh1", label: "Dog", emoji: "🐶", isTarget: true },
          { id: "vh2", label: "Apple", emoji: "🍎", isTarget: false },
          { id: "vh3", label: "Cat", emoji: "🐱", isTarget: true },
          { id: "vh4", label: "Car", emoji: "🚗", isTarget: false },
          { id: "vh5", label: "Cow", emoji: "🐄", isTarget: true },
          { id: "vh6", label: "Ball", emoji: "⚽", isTarget: false },
          { id: "vh7", label: "Duck", emoji: "🦆", isTarget: true },
          { id: "vh8", label: "Hat", emoji: "🎩", isTarget: false },
        ],
      },
      {
        id: "vh-cmp", type: "sideBySide", x: 60, y: 356, w: 780, h: 200,
        prompt: "Now compare them.", imageSize: 36, fontSize: 16,
        rounds: [
          {
            id: "vr1", question: "Which one is bigger?",
            a: { label: "Cow", emoji: "🐄" }, b: { label: "Duck", emoji: "🦆" }, answer: "a",
          },
        ],
      },
    ]),
  },
  {
    id: `${STARTER_ID_PREFIX}readingTogether`,
    title: "Activity · Read it together",
    description:
      "A short story to read page by page, then tell back in their own words. Shared reading with a comprehension check.",
    domain: "Language",
    medium: "interactive",
    thumbnailColor: "#a16207",
    canvas: activity("Read it together", [
      {
        id: "rt-story", type: "storyTime", x: 60, y: 106, w: 460, h: 430,
        title: "The dog and the ball", imageSize: 36, fontSize: 17,
        pages: [
          { id: "rp1", text: "The dog found a ball.", emoji: "🐶" },
          { id: "rp2", text: "He ran all the way to the park.", emoji: "🌳" },
          { id: "rp3", text: "Oh no — the ball went in the pond!", emoji: "💦" },
          { id: "rp4", text: "A girl helped him get it back.", emoji: "🙂" },
        ],
      },
      {
        id: "rt-tell", type: "longAnswer", x: 550, y: 106, w: 290, h: 280,
        prompt: "What happened in the story?",
        placeholder: "First… and then…", minWords: 10, lines: 5, fontSize: 16,
      },
      {
        id: "rt-check", type: "yesNo", x: 550, y: 406, w: 290, h: 130,
        prompt: "Did the dog get the ball back?",
        answer: "yes", yesLabel: "Yes", noLabel: "No", fontSize: 16,
      },
    ]),
  },
  {
    id: `${STARTER_ID_PREFIX}letterFormation`,
    title: "Activity · Letter formation",
    description:
      "Trace the letter with a guide, then write it freehand beside it. The step most handwriting practice skips.",
    domain: "OT / Fine Motor",
    medium: "interactive",
    thumbnailColor: "#be123c",
    canvas: activity("Learn the letter S", [
      {
        id: "lf-trace", type: "traceGame", x: 60, y: 106, w: 380, h: 400,
        prompt: "Trace over the letter.",
        glyph: "S", strokeColor: "#7c3aed", strokeWidth: 12, coverage: 0.2, fontSize: 16,
      },
      {
        id: "lf-free", type: "drawPad", x: 470, y: 106, w: 370, h: 400,
        prompt: "Now write it yourself, with no guide.",
        strokeColor: "#2a2420", strokeWidth: 8, fontSize: 16,
      },
    ]),
  },
  {
    id: `${STARTER_ID_PREFIX}wordDetective`,
    title: "Activity · Word detective",
    description:
      "Work out the secret word from a clue, then use it in a sentence. Vocabulary and then meaning.",
    domain: "Language",
    medium: "interactive",
    thumbnailColor: "#c026d3",
    canvas: activity("Word detective", [
      {
        id: "wd-secret", type: "secretWord", x: 60, y: 106, w: 440, h: 400,
        prompt: "Guess the letters to find the word.",
        word: "rainbow", hint: "You see it after the rain", maxWrong: 6, fontSize: 17,
      },
      {
        id: "wd-use", type: "fillBlank", x: 530, y: 106, w: 310, h: 160,
        template: "After the rain we saw a ___.", answer: "rainbow",
        caseSensitive: false, fontSize: 18,
      },
      {
        id: "wd-bank", type: "wordBank", x: 530, y: 290, w: 310, h: 216,
        title: "Words that might help",
        words: ["rainbow", "puddle", "cloud", "sunshine"],
        fontSize: 16, color: "#2a2420", borderColor: "#c9bfae",
      },
    ]),
  },
  {
    id: `${STARTER_ID_PREFIX}rewardRound`,
    title: "Activity · Reward round",
    description:
      "A puzzle and a card game for the end of a session. No target, no marking — a reason to have got through the hard part.",
    domain: "Behavioral",
    medium: "interactive",
    thumbnailColor: "#dc2626",
    canvas: activity("You earned this", [
      {
        id: "rr-puzzle", type: "puzzle", x: 60, y: 106, w: 330, h: 430,
        prompt: "Put the picture back together.",
        emoji: "🦋", rows: 3, cols: 3, fontSize: 15,
      },
      {
        id: "rr-battle", type: "battleTime", x: 420, y: 106, w: 420, h: 430,
        prompt: "Take turns. Tap a card to see what you win.",
        teamA: "Me", teamB: "You", fontSize: 15,
        cards: [
          { id: "rb1", label: "⭐", points: 1 },
          { id: "rb2", label: "⭐⭐", points: 2 },
          { id: "rb3", label: "💎", points: 3 },
          { id: "rb4", label: "⭐", points: 1 },
          { id: "rb5", label: "🎉", points: 5 },
          { id: "rb6", label: "⭐⭐", points: 2 },
        ],
      },
    ]),
  },

  // --- Printable forms and worksheets ----------------------------------------
  // The paper a clinic actually runs on. All static: nothing here is scored,
  // because it is filled in with a pen.

  {
    id: `${STARTER_ID_PREFIX}sessionNotes`,
    title: "Form · Session notes",
    description:
      "A one-page record of a session — what was worked on, what happened, and what comes next.",
    domain: "General",
    medium: "print",
    thumbnailColor: "#334155",
    canvas: sheet("Session notes", ["Patient", "Date", "Clinician"], [
      {
        id: "goals", type: "text", x: 48, y: 180, w: 700, h: 32,
        content: "Goals worked on today", fontSize: 18, fontWeight: "bold",
        color: "#2a2420", align: "left",
      },
      {
        id: "goal-list", type: "checklist", x: 48, y: 218, w: 700, h: 130,
        items: ["", "", "", ""], fontSize: 16, color: "#2a2420", lineGap: 18, boxSize: 18,
      },
      {
        id: "obs", type: "text", x: 48, y: 366, w: 700, h: 32,
        content: "What happened", fontSize: 18, fontWeight: "bold", color: "#2a2420", align: "left",
      },
      {
        id: "obs-lines", type: "writingLines", x: 48, y: 404, w: 700, h: 220,
        lines: 6, lineGap: 34, color: "#c9bfae", guide: "single",
      },
      {
        id: "data", type: "text", x: 48, y: 644, w: 700, h: 32,
        content: "Data", fontSize: 18, fontWeight: "bold", color: "#2a2420", align: "left",
      },
      {
        id: "data-table", type: "table", x: 48, y: 682, w: 700, h: 190,
        headerRow: true,
        rows: [
          ["Target", "Trials", "Correct", "%"],
          ["", "", "", ""],
          ["", "", "", ""],
          ["", "", "", ""],
          ["", "", "", ""],
        ],
        fontSize: 15, color: "#2a2420", borderColor: "#c9bfae",
      },
      {
        id: "next", type: "text", x: 48, y: 890, w: 700, h: 32,
        content: "Plan for next session", fontSize: 18, fontWeight: "bold",
        color: "#2a2420", align: "left",
      },
      {
        id: "next-lines", type: "writingLines", x: 48, y: 928, w: 700, h: 140,
        lines: 4, lineGap: 34, color: "#c9bfae", guide: "single",
      },
    ]),
  },
  {
    id: `${STARTER_ID_PREFIX}practiceLog`,
    title: "Form · Weekly practice log",
    description:
      "A fridge-door sheet for families: what to practise, a box to tick each day, and a star for every day done.",
    domain: "General",
    medium: "print",
    thumbnailColor: "#0891b2",
    canvas: sheet("Practice at home", ["Name", "Week beginning"], [
      {
        id: "note", type: "callout", x: 48, y: 180, w: 700, h: 92,
        title: "How to use this",
        body: "Five minutes a day beats an hour on Sunday. Tick the box when you have done it.",
        tone: "tip", fontSize: 15,
      },
      {
        id: "what", type: "wordBank", x: 48, y: 292, w: 700, h: 120,
        title: "This week we are practising",
        words: ["", ""], fontSize: 17, color: "#2a2420", borderColor: "#c9bfae",
      },
      {
        id: "log", type: "table", x: 48, y: 434, w: 700, h: 300,
        headerRow: true,
        rows: [
          ["Day", "Done", "How did it go?"],
          ["Monday", "", ""],
          ["Tuesday", "", ""],
          ["Wednesday", "", ""],
          ["Thursday", "", ""],
          ["Friday", "", ""],
          ["Saturday", "", ""],
          ["Sunday", "", ""],
        ],
        fontSize: 15, color: "#2a2420", borderColor: "#c9bfae",
      },
      {
        id: "stars", type: "rewardStars", x: 48, y: 760, w: 700, h: 90,
        total: 7, earned: 0, color: "#7c3aed", label: "Colour a star for every day you practise",
      },
      {
        id: "back", type: "text", x: 48, y: 872, w: 700, h: 32,
        content: "Anything you want to tell us?", fontSize: 18, fontWeight: "bold",
        color: "#2a2420", align: "left",
      },
      {
        id: "back-lines", type: "writingLines", x: 48, y: 910, w: 700, h: 150,
        lines: 4, lineGap: 36, color: "#c9bfae", guide: "single",
      },
    ]),
  },
  {
    id: `${STARTER_ID_PREFIX}handwriting`,
    title: "Worksheet · Handwriting practice",
    description:
      "Trace the word, then write it yourself. Ruled with a dotted midline, the way handwriting is taught.",
    domain: "OT / Fine Motor",
    medium: "print",
    thumbnailColor: "#f43f5e",
    canvas: sheet("Handwriting practice", ["Name", "Date"], [
      {
        id: "t1", type: "text", x: 48, y: 178, w: 700, h: 30,
        content: "Trace it", fontSize: 17, fontWeight: "bold", color: "#2a2420", align: "left",
      },
      {
        id: "trace", type: "letterBoxes", x: 48, y: 212, w: 700, h: 64,
        word: "sun", showLetters: true, boxSize: 52, color: "#2a2420",
      },
      {
        id: "t2", type: "text", x: 48, y: 292, w: 700, h: 30,
        content: "Now you", fontSize: 17, fontWeight: "bold", color: "#2a2420", align: "left",
      },
      {
        id: "blank1", type: "letterBoxes", x: 48, y: 326, w: 700, h: 64,
        word: "sun", showLetters: false, boxSize: 52, color: "#2a2420",
      },
      {
        id: "blank2", type: "letterBoxes", x: 48, y: 400, w: 700, h: 64,
        word: "sun", showLetters: false, boxSize: 52, color: "#2a2420",
      },
      {
        id: "t3", type: "text", x: 48, y: 486, w: 700, h: 30,
        content: "Write the whole word on the lines", fontSize: 17, fontWeight: "bold",
        color: "#2a2420", align: "left",
      },
      {
        id: "lines", type: "writingLines", x: 48, y: 520, w: 700, h: 300,
        lines: 6, lineGap: 46, color: "#c9bfae", guide: "dotted-midline",
      },
      {
        id: "grip", type: "callout", x: 48, y: 850, w: 700, h: 96,
        title: "For the grown-up",
        body: "Check the pencil grip before they start, and stop while it is still going well.",
        tone: "note", fontSize: 15,
      },
      {
        id: "stars2", type: "rewardStars", x: 48, y: 966, w: 700, h: 80,
        total: 3, earned: 0, color: "#7c3aed", label: "A star for each line you finish",
      },
    ]),
  },
  {
    id: `${STARTER_ID_PREFIX}visualSchedule`,
    title: "Worksheet · My day",
    description:
      "A visual schedule strip — pictures for each part of the day, with a box to tick as each one is done.",
    domain: "Behavioral",
    medium: "print",
    thumbnailColor: "#10b981",
    canvas: sheet("My day", ["Name", "Date"], [
      {
        id: "how", type: "callout", x: 48, y: 178, w: 700, h: 86,
        title: "How to use this",
        body: "Go through it together in the morning. Tick each picture as you finish it.",
        tone: "tip", fontSize: 15,
      },
      // Drawn as a row of sticker + label + arrow rather than a list, because
      // a visual schedule is read as pictures first and words second.
      { id: "s1", type: "sticker", x: 60, y: 300, w: 96, h: 96, emoji: "🌅" },
      { id: "a1", type: "arrow", x: 168, y: 330, w: 70, h: 36, color: "#c9bfae", thickness: 3, head: "end" },
      { id: "s2", type: "sticker", x: 250, y: 300, w: 96, h: 96, emoji: "🥣" },
      { id: "a2", type: "arrow", x: 358, y: 330, w: 70, h: 36, color: "#c9bfae", thickness: 3, head: "end" },
      { id: "s3", type: "sticker", x: 440, y: 300, w: 96, h: 96, emoji: "🎒" },
      { id: "a3", type: "arrow", x: 548, y: 330, w: 70, h: 36, color: "#c9bfae", thickness: 3, head: "end" },
      { id: "s4", type: "sticker", x: 630, y: 300, w: 96, h: 96, emoji: "📚" },
      {
        id: "labels", type: "table", x: 48, y: 410, w: 700, h: 70,
        headerRow: false,
        rows: [["Wake up", "Breakfast", "Get ready", "School"]],
        fontSize: 15, color: "#2a2420", borderColor: "#ffffff",
      },
      {
        id: "done", type: "checklist", x: 48, y: 500, w: 700, h: 220,
        items: ["Wake up", "Breakfast", "Get ready", "School", "Home time", "Bedtime"],
        fontSize: 18, color: "#2a2420", lineGap: 18, boxSize: 22,
      },
      {
        id: "best", type: "text", x: 48, y: 740, w: 700, h: 32,
        content: "The best bit of my day was…", fontSize: 18, fontWeight: "bold",
        color: "#2a2420", align: "left",
      },
      {
        id: "best-lines", type: "writingLines", x: 48, y: 778, w: 700, h: 150,
        lines: 4, lineGap: 36, color: "#c9bfae", guide: "single",
      },
      {
        id: "stars3", type: "rewardStars", x: 48, y: 950, w: 700, h: 80,
        total: 6, earned: 0, color: "#10b981", label: "A star for every part you finished",
      },
    ]),
  },
  {
    id: `${STARTER_ID_PREFIX}goalTracker`,
    title: "Form · Goal tracker",
    description:
      "Goals, baselines and targets on one page, with room to record where the patient is now.",
    domain: "General",
    medium: "print",
    thumbnailColor: "#6366f1",
    canvas: sheet("Goals and progress", ["Patient", "Review date", "Clinician"], [
      {
        id: "gt", type: "table", x: 48, y: 180, w: 700, h: 400,
        headerRow: true,
        rows: [
          ["Goal", "Baseline", "Target", "Now"],
          ["", "", "", ""],
          ["", "", "", ""],
          ["", "", "", ""],
          ["", "", "", ""],
          ["", "", "", ""],
          ["", "", "", ""],
        ],
        fontSize: 15, color: "#2a2420", borderColor: "#c9bfae",
      },
      {
        id: "met", type: "text", x: 48, y: 606, w: 700, h: 32,
        content: "Met this review", fontSize: 18, fontWeight: "bold", color: "#2a2420", align: "left",
      },
      {
        id: "met-list", type: "checklist", x: 48, y: 644, w: 700, h: 130,
        items: ["", "", "", ""], fontSize: 16, color: "#2a2420", lineGap: 18, boxSize: 18,
      },
      {
        id: "notes", type: "text", x: 48, y: 792, w: 700, h: 32,
        content: "Notes and next steps", fontSize: 18, fontWeight: "bold",
        color: "#2a2420", align: "left",
      },
      {
        id: "notes-lines", type: "writingLines", x: 48, y: 830, w: 700, h: 230,
        lines: 6, lineGap: 36, color: "#c9bfae", guide: "single",
      },
    ]),
  },
  {
    id: `${STARTER_ID_PREFIX}feelingsChart`,
    title: "Worksheet · How I feel today",
    description:
      "A feelings check-in to open a session — pick a face, name it, and say what caused it.",
    domain: "Social / Pragmatics",
    medium: "print",
    thumbnailColor: "#ec4899",
    canvas: sheet("How I feel today", ["Name", "Date"], [
      { id: "e1", type: "sticker", x: 70, y: 190, w: 88, h: 88, emoji: "😀" },
      { id: "e2", type: "sticker", x: 218, y: 190, w: 88, h: 88, emoji: "🙂" },
      { id: "e3", type: "sticker", x: 366, y: 190, w: 88, h: 88, emoji: "😐" },
      { id: "e4", type: "sticker", x: 514, y: 190, w: 88, h: 88, emoji: "😢" },
      { id: "e5", type: "sticker", x: 662, y: 190, w: 88, h: 88, emoji: "😡" },
      {
        id: "circle", type: "text", x: 48, y: 292, w: 700, h: 34,
        content: "Circle the face that looks like you right now.",
        fontSize: 17, fontWeight: "medium", color: "#2a2420", align: "center",
      },
      {
        id: "words", type: "wordBank", x: 48, y: 344, w: 700, h: 120,
        title: "Words that might help",
        words: ["happy", "calm", "tired", "worried", "sad", "cross", "excited", "shy"],
        fontSize: 17, color: "#2a2420", borderColor: "#c9bfae",
      },
      {
        id: "bubble", type: "speechBubble", x: 48, y: 490, w: 340, h: 150,
        text: "I feel…", fontSize: 20, color: "#2a2420", fill: "#ede9fe",
        tail: "left", thought: false,
      },
      {
        id: "thought", type: "speechBubble", x: 408, y: 490, w: 340, h: 150,
        text: "because…", fontSize: 20, color: "#2a2420", fill: "#e0f2fe",
        tail: "right", thought: true,
      },
      {
        id: "help", type: "text", x: 48, y: 670, w: 700, h: 32,
        content: "Something that would help me right now", fontSize: 18, fontWeight: "bold",
        color: "#2a2420", align: "left",
      },
      {
        id: "help-lines", type: "writingLines", x: 48, y: 708, w: 700, h: 190,
        lines: 5, lineGap: 36, color: "#c9bfae", guide: "single",
      },
      {
        id: "adult", type: "callout", x: 48, y: 920, w: 700, h: 110,
        title: "For the grown-up",
        body: "Name the feeling back to them before you try to fix it. Being understood comes first.",
        tone: "note", fontSize: 15,
      },
    ]),
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
