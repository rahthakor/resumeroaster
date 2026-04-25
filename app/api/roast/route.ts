import { NextResponse } from "next/server";
import OpenAI from "openai";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["application/pdf", "image/jpeg", "image/png"]);

function buildSystemPrompt(mode: string): string {
  const toneMap: Record<string, string> = {
    gentle: "You are constructive and encouraging, like a supportive career coach. Be honest but kind — point out every issue, but frame it warmly.",
    brutal: "You are direct and unflinching. No corporate fluff, no hedging. Call out every flaw plainly.",
    savage: "You are relentlessly harsh and darkly funny. Roast them without mercy while still being genuinely useful. Make it sting.",
  };
  const tone = toneMap[mode] ?? toneMap.brutal;

  return `${tone}

Analyze this resume and respond ONLY with valid JSON matching this exact structure:
{
  "quote": "1-2 sentence opening roast matching the tone above",
  "score": {
    "overall": 5,
    "breakdown": {
      "clarity":    { "score": 4, "note": "max 10-word blurb" },
      "impact":     { "score": 7, "note": "max 10-word blurb" },
      "formatting": { "score": 2, "note": "max 10-word blurb" },
      "keywords":   { "score": 8, "note": "max 10-word blurb" },
      "ats":        { "score": 3, "note": "max 10-word blurb" }
    }
  },
  "improvements": [
    {
      "number": 1,
      "title": "specific improvement title",
      "before": "weak example copied from their actual resume",
      "after": "strong rewrite",
      "why": "one sentence on why this matters"
    }
  ],
  "vibe": "one-liner summary of the overall impression"
}

Rules: all scores must be integers 1-10. improvements must have exactly 5 items.`;
}

function isValidResult(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  const d = data as any;
  return (
    typeof d.quote === "string" &&
    typeof d.vibe === "string" &&
    typeof d.score?.overall === "number" &&
    d.score?.breakdown != null &&
    typeof d.score.breakdown.clarity?.score === "number" &&
    Array.isArray(d.improvements) &&
    d.improvements.length === 5
  );
}

export async function POST(req: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured. Add it to your .env.local file." },
      { status: 500 }
    );
  }

  let file: File | null = null;
  let mode = "brutal";
  try {
    const formData = await req.formData();
    file = formData.get("file") as File | null;
    const modeVal = formData.get("mode");
    if (typeof modeVal === "string" && ["gentle", "brutal", "savage"].includes(modeVal)) {
      mode = modeVal;
    }
  } catch {
    return NextResponse.json({ error: "Invalid request — expected multipart form data." }, { status: 400 });
  }

  if (!file) return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
  if (!ALLOWED_TYPES.has(file.type)) return NextResponse.json({ error: "Only PDF, JPG, and PNG files are accepted." }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.byteLength > MAX_BYTES) {
    return NextResponse.json({ error: "File too large — max 10MB." }, { status: 400 });
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const systemPrompt = buildSystemPrompt(mode);
  let messages: OpenAI.Chat.ChatCompletionMessageParam[];

  if (file.type === "application/pdf") {
    const { default: PDFParser } = await import("pdf2json");
    const text = await new Promise<string>((resolve, reject) => {
      const parser = new PDFParser(null, true);
      parser.on("pdfParser_dataReady", () => {
        resolve((parser as any).getRawTextContent() as string);
      });
      parser.on("pdfParser_dataError", (err: unknown) => reject(err));
      parser.parseBuffer(buffer);
    });

    if (!text.trim()) {
      return NextResponse.json({ error: "Could not extract text from PDF. Try uploading an image instead." }, { status: 400 });
    }
    const cleaned = text
      .replace(/-+\s*Page\s*\(\d+\)\s*Break\s*-+/gi, "\n\n")
      .replace(/[●▪◦∙·]/g, "-")
      .replace(/\r/g, "")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: cleaned },
    ];
  } else {
    const base64 = buffer.toString("base64");
    messages = [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [{ type: "image_url", image_url: { url: `data:${file.type};base64,${base64}` } }],
      },
    ];
  }

  let content: string | null = null;
  try {
    const completion = await client.chat.completions.create({
      model: "gpt-5.4-mini",
      messages,
      response_format: { type: "json_object" },
      temperature: 0.8,
    });
    content = completion.choices[0]?.message?.content ?? null;
  } catch (err) {
    console.error("[roast] OpenAI error:", err);
    return NextResponse.json({ error: "The roast failed — please try again." }, { status: 502 });
  }

  if (!content) {
    return NextResponse.json({ error: "No response from the model." }, { status: 502 });
  }

  let result: unknown;
  try {
    result = JSON.parse(content);
  } catch {
    console.error("[roast] Failed to parse model response:", content);
    return NextResponse.json({ error: "Model returned an unreadable response — try again." }, { status: 502 });
  }

  if (!isValidResult(result)) {
    console.error("[roast] Response missing required fields:", result);
    return NextResponse.json({ error: "Incomplete roast response — try again." }, { status: 502 });
  }

  return NextResponse.json(result);
}
