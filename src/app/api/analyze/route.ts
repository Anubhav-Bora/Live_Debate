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
    
    Provide feedback in the following format for each participant:
    1. Argument Structure (1-10): Score and detailed analysis
    2. Logical Consistency (1-10): Score and detailed analysis
    3. Persuasiveness (1-10): Score and detailed analysis
    4. Tone and Delivery (1-10): Score and detailed analysis
    5. Overall Effectiveness (1-10): Score and summary
    
    Also provide 3 specific suggestions for improvement for each participant.
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