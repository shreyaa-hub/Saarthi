import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateWorksheet, worksheetToCanvas } from "@/lib/ai/worksheet";

const THUMBNAIL_COLORS = ["#1e6f6a", "#f5a623", "#5b6bd6", "#d64545", "#2f9e5b", "#a05bd6"];

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const topic = String(body?.topic || "").trim();
  const domain = String(body?.domain || "General");
  const instructions = String(body?.instructions || "").trim();

  if (!topic) {
    return NextResponse.json({ error: "Describe a topic first." }, { status: 400 });
  }

  try {
    const draft = await generateWorksheet(topic, domain, instructions);
    const canvas = worksheetToCanvas(draft);

    const { data, error } = await supabase
      .from("templates")
      .insert({
        owner_id: user.id,
        title: draft.title,
        domain,
        medium: "print",
        canvas,
        thumbnail_color: THUMBNAIL_COLORS[Math.floor(Math.random() * THUMBNAIL_COLORS.length)],
      })
      .select("id")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? "Could not save the worksheet." }, { status: 500 });
    }

    return NextResponse.json({ templateId: data.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Worksheet generation failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
