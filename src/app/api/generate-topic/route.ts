import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { transcript, debateTopic } = await req.json();

    if (!transcript || !debateTopic) {
      return NextResponse.json(
        { error: "Transcript and debate topic are required" },
        { status: 400 }
      );
    }

    const prompt = `
    Analyze this debate transcript and provide detailed feedback on both participants' performance.
    
    Debate Topic: ${debateTopic}
    
    Transcript:
    ${transcript}
    
    Provide scores (1-10) in this exact format:
    [Participant 1]
    Argument Structure: [score]/10
    Logical Consistency: [score]/10
    Persuasiveness: [score]/10
    Tone and Delivery: [score]/10
    
    [Participant 2]
    Argument Structure: [score]/10
    Logical Consistency: [score]/10
    Persuasiveness: [score]/10
    Tone and Delivery: [score]/10
    
    3 improvement suggestions for each participant.
    `;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "mistralai/mistral-7b-instruct", // Free model
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 1500
      })
    });

    const data = await response.json();
    const analysis = data.choices[0]?.message?.content;

    if (!analysis) {
      throw new Error("No analysis generated");
    }

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error("Error analyzing debate:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}