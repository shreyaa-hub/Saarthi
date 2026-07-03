import Anthropic from "@anthropic-ai/sdk";

export type AttemptSummary = {
  activityTitle: string;
  domain?: string;
  completedAt: string;
  correctCount: number;
  totalCount: number;
  durationSeconds: number | null;
};

export type InsightResult = {
  summary: string;
  strengths: string[];
  concerns: string[];
  recommendations: string[];
};

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

function buildPrompt(patientName: string, attempts: AttemptSummary[]) {
  const rows = attempts
    .map(
      (a, i) =>
        `${i + 1}. "${a.activityTitle}"${a.domain ? ` [${a.domain}]` : ""} — ${a.correctCount}/${a.totalCount} correct, completed ${a.completedAt}${a.durationSeconds ? `, took ${a.durationSeconds}s` : ""}`,
    )
    .join("\n");

  return `You are a clinical assistant helping a therapy clinician review a patient's recent home-practice activity data. Do not diagnose. Base the summary strictly on the data provided.

Patient: ${patientName}
Recent activity attempts (most recent last):
${rows}

Write a concise clinical progress summary. Respond with ONLY valid JSON (no markdown fences) matching exactly this shape:
{
  "summary": "2-4 sentence overview of trends across these attempts",
  "strengths": ["short bullet", "short bullet"],
  "concerns": ["short bullet", "short bullet"],
  "recommendations": ["short, actionable suggestion for the next session"]
}
Keep each bullet under 15 words. If there isn't enough data for a section, return an empty array for it.`;
}

export async function generateInsights(
  patientName: string,
  attempts: AttemptSummary[],
): Promise<InsightResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not configured on the server. Add it to your environment to enable AI insights.",
    );
  }

  const client = new Anthropic({ apiKey });
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 700,
    messages: [{ role: "user", content: buildPrompt(patientName, attempts) }],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  const raw = textBlock && "text" in textBlock ? textBlock.text : "";

  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
    return {
      summary: String(parsed.summary ?? ""),
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths.map(String) : [],
      concerns: Array.isArray(parsed.concerns) ? parsed.concerns.map(String) : [],
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations.map(String) : [],
    };
  } catch {
    return { summary: raw || "No summary generated.", strengths: [], concerns: [], recommendations: [] };
  }
}
