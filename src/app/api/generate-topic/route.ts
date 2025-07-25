import { NextResponse } from "next/server";

export async function GET() {
  const prompt = `Generate 5 debate topics suitable for a live debate platform. 
    Topics should be controversial but family-friendly, and phrased as propositions. 
    Return a JSON object with a "topics" array containing the topics. Example:
    {"topics": ["Topic 1", "Topic 2", "Topic 3", "Topic 4", "Topic 5"]}`;

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    if (content) {
      const parsed = JSON.parse(content);
      if (parsed.topics && Array.isArray(parsed.topics)) {
        return NextResponse.json(parsed.topics);
      }
    }

    throw new Error("Invalid response format");
    
  } catch (error) {
    console.error("Failed to generate topics:", error);
    // Fallback topics
    return NextResponse.json([
      "Social media does more harm than good",
      "Universal basic income should be implemented worldwide",
      "Animal testing for cosmetics should be banned globally",
      "College education should be free in all countries",
      "AI development should be regulated by an international body"
    ]);
  }
}