import Anthropic from "@anthropic-ai/sdk";
import type { CanvasElement, TemplateCanvas } from "@/lib/types/canvas";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

export type WorksheetDraft = {
  title: string;
  items: string[];
};

function buildPrompt(topic: string, domain: string, instructions: string) {
  return `You are helping a therapy clinician draft a printable worksheet.

Topic: ${topic}
Domain: ${domain}
${instructions ? `Additional instructions: ${instructions}` : ""}

Respond with ONLY valid JSON (no markdown fences) matching exactly this shape:
{
  "title": "A short worksheet title",
  "items": ["First prompt or question", "Second prompt or question", "..."]
}
Write 5 to 8 items. Each item should be a single, clear prompt, question, or
short instruction a patient could respond to in the blank space below it on a
printed page. Keep each item under 20 words.`;
}

export async function generateWorksheet(
  topic: string,
  domain: string,
  instructions: string,
): Promise<WorksheetDraft> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not configured on the server. Add it to your environment to enable the worksheet generator.",
    );
  }

  const client = new Anthropic({ apiKey });
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 500,
    messages: [{ role: "user", content: buildPrompt(topic, domain, instructions) }],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  const raw = textBlock && "text" in textBlock ? textBlock.text : "";

  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
    const items = Array.isArray(parsed.items) ? parsed.items.map(String).slice(0, 10) : [];
    if (items.length === 0) throw new Error("No items generated");
    return { title: String(parsed.title || topic), items };
  } catch {
    throw new Error("Couldn't parse the generated worksheet. Try again.");
  }
}

const ROW_HEIGHT = 95;
const START_Y = 150;
const MARGIN_X = 60;
const CONTENT_W = 780;

export function worksheetToCanvas(draft: WorksheetDraft): TemplateCanvas {
  const elements: CanvasElement[] = [
    {
      id: "ws-title",
      type: "text",
      x: MARGIN_X,
      y: 40,
      w: CONTENT_W,
      h: 50,
      content: draft.title,
      fontSize: 28,
      fontWeight: "bold",
      color: "#2a2420",
      align: "left",
    },
  ];

  draft.items.forEach((item, i) => {
    const y = START_Y + i * ROW_HEIGHT;
    elements.push({
      id: `ws-item-${i}`,
      type: "text",
      x: MARGIN_X,
      y,
      w: CONTENT_W,
      h: 28,
      content: `${i + 1}. ${item}`,
      fontSize: 17,
      fontWeight: "medium",
      color: "#2a2420",
      align: "left",
    });
    elements.push({
      id: `ws-line-${i}`,
      type: "shape",
      x: MARGIN_X,
      y: y + 45,
      w: CONTENT_W,
      h: 2,
      shape: "rectangle",
      fill: "#d8d0c0",
      stroke: "transparent",
      strokeWidth: 0,
    });
  });

  const height = START_Y + draft.items.length * ROW_HEIGHT + 40;

  return {
    width: 900,
    height: Math.max(600, height),
    background: "#ffffff",
    elements,
  };
}
