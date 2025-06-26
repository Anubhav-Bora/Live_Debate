"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function AIFeedback({ debateId, userId, role }: {
  debateId: string;
  userId: string;
  role: "pro" | "con" | "judge";
}) {
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState("");

  const handleGetFeedback = async () => {
    if (!feedback.trim()) {
      toast.error("Please enter your feedback request");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/ai-feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          debateId,
          userId,
          role,
          message: feedback
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setAiResponse(data.feedback);
        toast.success("AI feedback generated");
      } else {
        const errorData = await res.json();
        toast.error(errorData.error || "Failed to get AI feedback");
      }
    } catch (err) {
      console.error(err);
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>AI Debate Coach</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          placeholder="Ask the AI coach for feedback or suggestions..."
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          className="min-h-[100px]"
        />
        <Button 
          onClick={handleGetFeedback}
          disabled={loading}
        >
          {loading ? "Analyzing..." : "Get AI Feedback"}
        </Button>
        
        {aiResponse && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium mb-2">AI Feedback:</h3>
            <p className="whitespace-pre-wrap">{aiResponse}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}