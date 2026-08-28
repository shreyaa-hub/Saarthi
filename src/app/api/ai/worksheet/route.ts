import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateWorksheet, worksheetToCanvas } from "@/lib/ai/worksheet";
import { randomThumbnailColor } from "@/lib/canvas/colors";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  // Signed in is not enough. This endpoint spends money on every call and
  // creates a template, which is a clinician's artefact — and sign-up is
  // open, so without this any visitor could register as a patient and drive
  // the worksheet generator in a loop. The page that offers this feature is
  // already behind a clinician role check; the route it posts to was not, and
  // a route is what an attacker calls.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "clinician") {
    return NextResponse.json({ error: "Clinicians only." }, { status: 403 });
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
        thumbnail_color: randomThumbnailColor(),
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
