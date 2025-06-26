// /api/generate-topic/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function GET() {
  const prompt = "Generate 5 debate topics suitable for a live debate platform. Topics should be controversial but family-friendly, and phrased as propositions. Return as a JSON array.";
  
  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" }
  });

  try {
    const topics = JSON.parse(response.choices[0]?.message?.content || "{}").topics;
    return NextResponse.json(topics || []);
  } catch {
    return NextResponse.json([
      "Social media does more harm than good",
      "Universal basic income should be implemented worldwide",
      "Animal testing for cosmetics should be banned globally",
      "College education should be free in all countries",
      "AI development should be regulated by an international body"
    ]);
  }
}