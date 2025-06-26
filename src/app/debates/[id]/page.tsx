"use client";
import { useUser } from "@clerk/nextjs";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import Link from "next/link";
import DebateRoom from "@/components/DebateRoom";

export default function DebatePage() {
  const params = useParams();
  const id = params?.id as string; // Explicitly cast to string
  const { user } = useUser();
  const router = useRouter();
  const [debate, setDebate] = useState<any>(null);
  const [role, setRole] = useState<"pro" | "con" | "judge" | "viewer">("viewer");
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const fetchDebate = async () => {
      try {
        const res = await fetch(`/api/debates/${id}`);
        if (res.ok) {
          const data = await res.json();
          setDebate(data);
          
          if (user?.id) {
            if (data.proUser?.clerkId === user.id) {
              setRole("pro");
            } else if (data.conUser?.clerkId === user.id) {
              setRole("con");
            } else if (data.judge?.clerkId === user.id) {
              setRole("judge");
            }
          }
        }
      } catch (error) {
        console.error("Error fetching debate:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDebate();
  }, [id, user?.id]);

  const handleJoin = async (action: "join_con" | "join_judge") => {
    if (!user?.id || !id) return;

    try {
      const res = await fetch(`/api/debates/${id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
          action,
          joinCode,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setDebate(data);
        setRole(action === "join_con" ? "con" : "judge");
        toast.success(`Joined as ${action === "join_con" ? "Con" : "Judge"}`);
      } else {
        const errorData = await res.json();
        toast.error(errorData.error || "Failed to join");
      }
    } catch (error) {
      console.error("Error joining debate:", error);
      toast.error("An error occurred while joining");
    }
  };

  if (loading) {
    return <div className="container mx-auto px-4 py-8">Loading...</div>;
  }

  if (!debate) {
    return <div className="container mx-auto px-4 py-8">Debate not found</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{debate.topic}</h1>
        <Button variant="outline" onClick={() => router.push("/debates")}>
          Back to Debates
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Pro</CardTitle>
          </CardHeader>
          <CardContent>
            {debate.proUser ? (
              <div className="flex items-center gap-2">
                <span>{debate.proUser.username}</span>
                {debate.proUser.clerkId === user?.id && (
                  <Badge variant="default">You</Badge>
                )}
              </div>
            ) : (
              <div>Open</div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Con</CardTitle>
          </CardHeader>
          <CardContent>
            {debate.conUser ? (
              <div className="flex items-center gap-2">
                <span>{debate.conUser.username}</span>
                {debate.conUser.clerkId === user?.id && (
                  <Badge variant="default">You</Badge>
                )}
              </div>
            ) : (
              <div>Open</div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Judge</CardTitle>
          </CardHeader>
          <CardContent>
            {debate.judge ? (
              <div className="flex items-center gap-2">
                <span>{debate.judge.username}</span>
                {debate.judge.clerkId === user?.id && (
                  <Badge variant="default">You</Badge>
                )}
              </div>
            ) : (
              <div>Open</div>
            )}
          </CardContent>
        </Card>
      </div>

      {role === "viewer" && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Join Debate</CardTitle>
            <CardDescription>
              {debate.isPublic ? "Public debate - anyone can view" : "Private debate - join codes required"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!debate.conUser && (
              <div>
                <Label>Join as Con Participant</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                    placeholder="Enter con join code"
                  />
                  <Button 
                    onClick={() => handleJoin("join_con")}
                    disabled={!joinCode.trim()}
                  >
                    Join as Con
                  </Button>
                </div>
              </div>
            )}
            
            {!debate.judge && (
              <div>
                <Label>Join as Judge</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                    placeholder="Enter judge join code"
                  />
                  <Button 
                    onClick={() => handleJoin("join_judge")}
                    disabled={!joinCode.trim()}
                  >
                    Join as Judge
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {id && ( // Only render DebateRoom if id exists
        <DebateRoom 
          debateId={id} 
          userId={user?.id} 
          isPro={role === "pro"}
          isCon={role === "con"}
          isJudge={role === "judge"}
        />
      )}
    </div>
  );
}