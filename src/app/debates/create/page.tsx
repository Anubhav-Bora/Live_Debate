"use client";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import Link from "next/link";

export default function CreateDebatePage() {
  const { user } = useUser();
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [duration, setDuration] = useState(180);
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading] = useState(false);
  const [createdDebate, setCreatedDebate] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) {
      toast.error("Topic is required");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/debates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          topic, 
          duration,
          isPublic 
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setCreatedDebate(data);
        toast.success("Debate created successfully!");
      } else {
        const errorData = await res.json();
        toast.error(errorData.error || "Failed to create debate");
      }
    } catch (err) {
      console.error(err);
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Sign In Required</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              You need to sign in to create a debate
            </p>
            <Button onClick={() => router.push("/sign-in")}>Sign In</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (createdDebate) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl">Debate Created!</CardTitle>
            <CardDescription>
              Share the Debate ID and Con Code with participants:
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Debate ID</Label>
              <Input value={createdDebate.id} readOnly />
              <p className="text-sm text-muted-foreground mt-1">
                Anyone can join the debate room using this ID.
              </p>
            </div>
            <div>
              <Label>Con Join Code</Label>
              <Input value={createdDebate.joinCodeCon} readOnly />
              <p className="text-sm text-muted-foreground mt-1">
                Only the con participant should use this code to join as con.
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button asChild>
              <Link href={`/debates/${createdDebate.id}`}>
                Go to Debate Room
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl">Create New Debate</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="topic">Debate Topic</Label>
              <Textarea
                id="topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Enter the debate topic..."
                className="min-h-[100px]"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Duration (seconds)</Label>
              <Input
                id="duration"
                type="number"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                min="60"
                max="1800"
              />
              <p className="text-sm text-muted-foreground">
                Debate duration in seconds (60-1800)
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isPublic"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <Label htmlFor="isPublic">Public Debate</Label>
            </div>
            <p className="text-sm text-muted-foreground">
              Public debates can be viewed by anyone, while private debates require a join code
            </p>
          </form>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => router.push("/debates")}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !topic.trim()}
          >
            {loading ? "Creating..." : "Create Debate"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}