import { NextResponse } from "next/server";
import OpenAI from "openai";

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

  if (!file) {
    return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  let messages: OpenAI.Chat.ChatCompletionMessageParam[];

  if (file.type === "application/pdf") {
    const pdfParse = (await import("pdf-parse")).default;
    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = await pdfParse(buffer);
    const text = parsed.text.trim();
    if (!text) {
      return NextResponse.json({ error: "Could not extract text from PDF. Is it a scanned image?" }, { status: 400 });
    }
    messages = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: text },
    ];
  } else {
    // JPG / PNG — send directly to OpenAI vision
    const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
    messages = [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          { type: "image_url", image_url: { url: `data:${file.type};base64,${base64}` } },
        ],
      },
    ];
  }

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-5.4-mini",
      messages,
      response_format: { type: "json_object" },
      temperature: 0.8,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ error: "No response from OpenAI." }, { status: 502 });
    }

    return NextResponse.json(JSON.parse(content));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error calling OpenAI.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
