import { NextResponse } from "next/server";
import OpenAI from "openai";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["application/pdf", "image/jpeg", "image/png"]);

const SYSTEM_PROMPT = `You are a brutal but constructive resume critic. Analyze this resume and provide:
1. A savage but funny opening roast (1-2 sentences, make them laugh)
2. SCORE: Rate it 1-10 with breakdown:
   - Clarity (1-10)
   - Impact (1-10)
   - Formatting (1-10)
   - Keyword Strength (1-10)
   - ATS Compatibility (1-10)
3. TOP 5 IMPROVEMENTS: Specific, actionable fixes with before/after examples
4. OVERALL VIBE: What this resume says about them (be funny)

Respond ONLY with valid JSON matching this exact structure:
{
  "roast": "savage but funny opening roast",
  "score": {
    "overall": 5,
    "breakdown": {
      "clarity": 3,
      "impact": 4,
      "formatting": 6,
      "keywords": 1,
      "ats": 3
    }
  },
  "improvements": [
    {
      "number": 1,
      "title": "improvement title",
      "before": "weak example",
      "after": "strong example"
    }
  ],
  "vibe": "funny overall vibe comment"
}

All scores must be integers 1-10. The improvements array must have exactly 5 items.`;

function isValidResult(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.roast === "string" &&
    typeof d.vibe === "string" &&
    typeof d.score === "object" && d.score !== null &&
    Array.isArray((d as any).improvements) &&
    (d as any).improvements.length === 5
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
  try {
    const formData = await req.formData();
    file = formData.get("file") as File | null;
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
  let messages: OpenAI.Chat.ChatCompletionMessageParam[];

  if (file.type === "application/pdf") {
    const { default: PDFParser } = await import("pdf2json");
    const text = await new Promise<string>((resolve, reject) => {
      const parser = new PDFParser(null, 1);
      parser.on("pdfParser_dataReady", () => {
        resolve((parser as any).getRawTextContent() as string);
      });
      parser.on("pdfParser_dataError", (err: unknown) => reject(err));
      parser.parseBuffer(buffer);
    });

    if (!text.trim()) {
      return NextResponse.json({ error: "Could not extract text from PDF. Try uploading an image instead." }, { status: 400 });
    }
    messages = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: text.trim() },
    ];
  } else {
    const base64 = buffer.toString("base64");
    messages = [
      { role: "system", content: SYSTEM_PROMPT },
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
