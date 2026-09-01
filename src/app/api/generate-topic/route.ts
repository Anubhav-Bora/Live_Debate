import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { allowRequest } from "@/lib/rateLimit";
import { readJsonObject } from "@/lib/request";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!allowRequest(`topic:${user.id}`, 5, 60_000)) {
    return NextResponse.json({ error: "Please wait before generating another topic." }, { status: 429 });
  }
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) return NextResponse.json({ error: "AI is not configured" }, { status: 503 });

  try {
    const body = await readJsonObject<{ category?: unknown }>(request);
    if (!body) return NextResponse.json({ error: "A valid JSON request is required." }, { status: 400 });
    const category = typeof body.category === "string" ? body.category.trim().slice(0, 60) : "general";
    const model = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: `Create one balanced, specific debate motion in the ${category} category. Return only the motion, under 180 characters.` }] }],
        generationConfig: { temperature: 0.8, maxOutputTokens: 80 },
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error(`Provider returned ${response.status}`);
    const data = await response.json();
    const topic = data?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || "").join("").trim().replace(/^['"]|['"]$/g, "").slice(0, 240);
    if (!topic) throw new Error("No topic returned");
    return NextResponse.json({ topic });
  } catch (error) {
    console.error("Could not generate topic:", error);
    return NextResponse.json({ error: "Could not generate a topic" }, { status: 502 });
  }
}
