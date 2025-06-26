import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 1500,
    });

    const analysis = response.choices[0]?.message?.content;

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