"use client";
import { useUser } from "@clerk/nextjs";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import Link from "next/link";
import VideoDebateRoom from "@/components/VideoDebateRoom";
import { useSocket } from "@/context/SocketContext";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function DebatePage() {
  const params = useParams();
  const id = params?.id as string; // Explicitly cast to string
  const { user } = useUser();
  const router = useRouter();
  const [debate, setDebate] = useState<any>(null);
  const [role, setRole] = useState<"pro" | "con" | "viewer">("viewer");
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(true);
  const { socket, isConnected } = useSocket();
  const [debateStatus, setDebateStatus] = useState<string>(debate?.status || "waiting");
  const [timer, setTimer] = useState<number | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const timerInterval = useRef<NodeJS.Timeout | null>(null);

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
            }
          }
        } else {
          setDebate(null);
          setLoading(false);
          toast.error(`Failed to fetch debate: ${res.status}`);
        }
      } catch (error) {
        setDebate(null);
        setLoading(false);
        toast.error("Error fetching debate");
      } finally {
        setLoading(false);
      }
    };

    fetchDebate();
  }, [id, user?.id]);

  useEffect(() => {
    if (!socket) return;
    const onStarted = ({ startTime, duration }: { startTime: string, duration: number }) => {
      setDebateStatus("in-progress");
      setTimer(duration);
    };
    const onEnded = () => {
      setDebateStatus("completed");
      setTimer(0);
    };
    socket.on("debate_started", onStarted);
    socket.on("debate_ended", onEnded);
    return () => {
      socket.off("debate_started", onStarted);
      socket.off("debate_ended", onEnded);
    };
  }, [socket]);

  useEffect(() => {
    if (debate?.status) setDebateStatus(debate.status);
  }, [debate?.status]);

  // Fetch messages
  useEffect(() => {
    if (!id) return;
    const fetchMessages = async () => {
      try {
        const res = await fetch(`/api/debates/${id}/messages`);
        if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
        const data = await res.json();
        setMessages(data);
      } catch (error) {
        // ignore for now
      }
    };
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [id]);

  // Timer logic
  useEffect(() => {
    if (debateStatus !== "in-progress" || !timer) return;
    setTimeLeft(timer);
    if (timerInterval.current) clearInterval(timerInterval.current);
    timerInterval.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          setDebateStatus("completed");
          clearInterval(timerInterval.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerInterval.current) clearInterval(timerInterval.current); };
  }, [debateStatus, timer]);

  // Listen for AI feedback
  useEffect(() => {
    if (!socket) return;
    const onFeedback = (feedback: any) => {
      setAiFeedback(feedback);
    };
    socket.on("debate_feedback", onFeedback);
    return () => {
      socket.off("debate_feedback", onFeedback);
    };
  }, [socket]);

  const handleJoin = async (action: "join_con") => {
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
        setRole("con");
        toast.success("Joined as Con");
      } else {
        let errorMsg = "Failed to join";
        try {
          const errorData = await res.json();
          errorMsg = errorData.error || errorMsg;
        } catch (e) {}
        toast.error(errorMsg);
      }
    } catch (error) {
      toast.error("An error occurred while joining");
    }
  };

  const handleStartDebate = () => {
    if (!socket || !isConnected) {
      toast.error("Socket not connected. Please refresh the page.");
      return;
    }
    socket.emit("start_debate", { debateId: id });
  };

  // Send message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || isSending || !user?.id) return;
    setIsSending(true);
    try {
      const res = await fetch(`/api/debates/${id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          content: newMessage,
          role,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setNewMessage("");
    } catch (error) {
      toast.error("Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  if (loading) {
    return <div className="container mx-auto px-4 py-8">Loading...</div>;
  }

  if (!debate) {
    return <div className="container mx-auto px-4 py-8 text-red-500 font-bold">Debate not found or failed to load. Please check the debate ID or try again later.</div>;
  }

  // Show join codes for debugging (development only)
  const isDev = process.env.NODE_ENV !== "production";

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{debate.topic}</h1>
        <Button variant="outline" onClick={() => router.push("/debates")}>
          Back to Debates
        </Button>
      </div>
      
      {isDev && (
        <div className="mb-4 p-2 bg-yellow-100 border border-yellow-400 rounded text-xs">
          <div><b>Debug:</b> Join code for Con: <span className="font-mono">{debate.joinCodeCon}</span></div>
          <div>Debate ID: <span className="font-mono">{debate.id}</span></div>
        </div>
      )}

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
      </div>

      {/* Debug Info */}
      <div className="mb-2 p-2 bg-gray-100 rounded text-xs">
        <b>Role:</b> {role} | <b>Status:</b> {debateStatus} | <b>Timer:</b> {timeLeft !== null ? `${timeLeft}s` : "-"}
      </div>
      {/* Timer Section */}
      <div className="mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Debate Timer</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono">
              {debateStatus === "in-progress" && timeLeft !== null ? `${timeLeft}s` : `${debate.duration} seconds`}
            </div>
            {debateStatus === "completed" && <div className="text-red-600 font-semibold">Debate Ended</div>}
          </CardContent>
        </Card>
      </div>

      {role === "viewer" && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Join Debate</CardTitle>
            <CardDescription>
              Join as Con (with code) or as Viewer (no code required)
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
                    placeholder={isDev ? `Enter con join code (see above)` : "Enter con join code"}
                  />
                  <Button 
                    onClick={() => handleJoin("join_con")}
                    disabled={!joinCode.trim() || !!debate.conUser}
                  >
                    Join as Con
                  </Button>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Make sure you enter the exact join code (case-sensitive).
                </div>
              </div>
            )}
            <div>
              <Label>Or join as Viewer</Label>
              <Button className="ml-2" onClick={() => setRole("viewer")}>Join as Viewer</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {id && (role === "pro" || role === "con") && user?.id && (
        <>
          {/* Start Debate button for pro user when waiting */}
          {role === "pro" && debateStatus === "waiting" && (
            <div className="mb-4 flex justify-center">
              <Button onClick={handleStartDebate} disabled={!isConnected}>
                Start Debate
              </Button>
            </div>
          )}
          <VideoDebateRoom 
            debateId={id} 
            userId={user.id} 
            role={role}
          />
          {/* Chat Box */}
          <div className="mt-6 border rounded-lg bg-white">
            <div className="p-2 border-b font-semibold">Chat</div>
            <ScrollArea className="h-64 p-4">
              {messages.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No messages yet. Start the conversation!
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`p-3 rounded-lg max-w-[80%] ${
                        message.role === "pro"
                          ? "bg-green-100"
                          : message.role === "con"
                            ? "bg-red-100"
                            : "bg-gray-100"
                      }`}
                    >
                      <div className="font-medium text-sm flex items-center gap-2">
                        <span>{message.sender?.username || message.role}</span>
                        <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                          {message.role}
                        </Badge>
                      </div>
                      <p className="whitespace-pre-wrap mt-1">{message.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
            <div className="p-4 border-t flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={debateStatus === "completed" ? "Debate has ended" : role === "pro" ? "State your argument as Pro..." : role === "con" ? "Counter the argument as Con..." : "Viewers cannot send messages"}
                disabled={debateStatus !== "in-progress" || !(role === "pro" || role === "con")}
              />
              <Button onClick={handleSendMessage} disabled={debateStatus !== "in-progress" || isSending || !newMessage.trim() || !(role === "pro" || role === "con")}>Send</Button>
            </div>
          </div>
          {/* AI Feedback after debate ends */}
          {debateStatus === "completed" && aiFeedback && (
            <div className="border rounded-lg p-4 my-4 bg-blue-50">
              <h3 className="font-bold mb-2">AI Feedback</h3>
              <div className="mb-2">
                <h4 className="font-semibold">Pro</h4>
                <div>Score: <span className="font-mono">{aiFeedback.pro?.score ?? '-'}</span></div>
                <div>Mistakes: <span className="font-mono">{aiFeedback.pro?.mistakes?.join(", ") ?? '-'}</span></div>
                <div>Improvements: <span className="font-mono">{aiFeedback.pro?.improvements?.join(", ") ?? '-'}</span></div>
                <div>Feedback: <span className="font-mono">{aiFeedback.pro?.feedback ?? '-'}</span></div>
              </div>
              <div>
                <h4 className="font-semibold">Con</h4>
                <div>Score: <span className="font-mono">{aiFeedback.con?.score ?? '-'}</span></div>
                <div>Mistakes: <span className="font-mono">{aiFeedback.con?.mistakes?.join(", ") ?? '-'}</span></div>
                <div>Improvements: <span className="font-mono">{aiFeedback.con?.improvements?.join(", ") ?? '-'}</span></div>
                <div>Feedback: <span className="font-mono">{aiFeedback.con?.feedback ?? '-'}</span></div>
              </div>
            </div>
          )}
        </>
      )}
      {id && role === "viewer" && (
        <div className="border rounded-lg p-8 text-center text-lg text-gray-600 mt-8">
          Only Pro and Con participants can join the live video debate.<br />
          Please wait for the debate to finish to see the AI feedback.
        </div>
      )}
    </div>
  );
}