"use client";
import { useState } from "react";

export default function AnalysisReport({
  debate,
  onBack,
}: {
  debate: any;
  onBack: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);

  const generateAnalysis = async () => {
    setLoading(true);
    try {
      const transcript = debate.messages
        .map((msg: any) => `${msg.sender.username} (${msg.role}): ${msg.content}`)
        .join("\n");

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transcript,
          debateTopic: debate.topic,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setAnalysis(data.analysis);
      }
    } catch (error) {
      console.error("Error generating analysis:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <button
        onClick={onBack}
        className="mb-4 text-blue-500 hover:underline"
      >
        ← Back to debate
      </button>
      
      <h2 className="text-2xl font-bold mb-4">AI Debate Analysis</h2>
      <h3 className="text-xl font-semibold mb-2">{debate.topic}</h3>
      
      {!analysis ? (
        <div className="text-center py-8">
          <button
            onClick={generateAnalysis}
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg disabled:opacity-50"
          >
            {loading ? "Analyzing..." : "Generate AI Analysis"}
          </button>
          <p className="mt-4 text-gray-600">
            Our AI will evaluate the debate based on argument structure, logical consistency, persuasiveness, and tone.
          </p>
        </div>
      ) : (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg whitespace-pre-wrap">
          {analysis}
        </div>
      )}
    </div>
  );
}