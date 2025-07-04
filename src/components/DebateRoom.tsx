"use client";
import { useState, useEffect, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Loader2, Copy as CopyIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useSocket } from "@/context/SocketContext";

interface Message {
  id: string;
  debateId: string;
  content: string;
  createdAt: string;
  sender: {
    id: string;
    clerkId: string;
    username: string;
  };
  role: string;
}

export default function DebateRoom({ 
  debateId, 
  userId, 
  isPro, 
  isCon, 
  isJudge,
  joinCodeCon
}: {
  debateId: string;
  userId?: string;
  isPro?: boolean;
  isCon?: boolean;
  isJudge?: boolean;
  joinCodeCon?: string;
}) {
  const { user } = useUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [errorCount, setErrorCount] = useState(0);
  const [connectionError, setConnectionError] = useState(false);
  const [conCode, setConCode] = useState<string>("");
  const [debateStatus, setDebateStatus] = useState<string>("waiting");
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [aiFeedback, setAiFeedback] = useState<any>(null);
  const timerInterval = useRef<NodeJS.Timeout | null>(null);
  const { socket, isConnected } = useSocket();
  const [fetchedDuration, setFetchedDuration] = useState<number>(180);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    let isMounted = true;

    const fetchMessages = async () => {
      if (errorCount >= 3) {
        if (isMounted) {
          setConnectionError(true);
          clearInterval(interval);
        }
        return;
      }

      try {
        const res = await fetch(`/api/debates/${debateId}/messages`);
        if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);

        const data = await res.json();
        if (isMounted) {
          setMessages(data);
          setErrorCount(0);
          setConnectionError(false);
        }
      } catch (error) {
        console.error("Fetch error:", error);
        if (isMounted) {
          setErrorCount(prev => prev + 1);
          if (errorCount >= 2) toast.error("Connection issues detected");
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchMessages();
    if (!connectionError) interval = setInterval(fetchMessages, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [debateId, errorCount, connectionError]);

  useEffect(() => {
    if (!debateId) return;
    fetch(`/api/debates/${debateId}`)
      .then(res => res.json())
      .then(data => {
        setConCode(data.joinCodeCon || "");
        setDebateStatus(data.status || "waiting");
        if (data.startTime) setStartTime(new Date(data.startTime));
        if (data.status === "completed" && data.aiFeedback) setAiFeedback(data.aiFeedback);
        setFetchedDuration(data.duration || 180);
      });
  }, [debateId]);

  useEffect(() => {
    if (!socket) return;
    const onStarted = ({ startTime, duration }: { startTime: string, duration: number }) => {
      setDebateStatus("in-progress");
      setStartTime(new Date(startTime));
      setTimeLeft(duration);
    };
    const onEnded = () => {
      setDebateStatus("completed");
      setTimeLeft(0);
    };
    const onFeedback = (feedback: any) => {
      setAiFeedback(feedback);
    };
    socket?.on("debate_started", onStarted);
    socket?.on("debate_ended", onEnded);
    socket?.on("debate_feedback", onFeedback);
    return () => {
      socket?.off("debate_started", onStarted);
      socket?.off("debate_ended", onEnded);
      socket?.off("debate_feedback", onFeedback);
    };
  }, [socket]);

  useEffect(() => {
    if (debateStatus !== "in-progress" || !startTime) return;
    const update = () => {
      const now = new Date();
      const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
      const left = Math.max(0, (fetchedDuration || 0) - elapsed);
      setTimeLeft(left);
      if (left <= 0) setDebateStatus("completed");
    };
    update();
    timerInterval.current = setInterval(update, 1000);
    return () => { if (timerInterval.current) clearInterval(timerInterval.current); };
  }, [debateStatus, startTime, fetchedDuration]);

  useEffect(() => {
    // Join the debate room on mount if socket is available and user is pro or con
    if (socket && debateId && (isPro || isCon)) {
      socket.emit("join_debate", { debateId, userId, role: isPro ? "pro" : "con" });
    }
  }, [socket, debateId, userId, isPro, isCon]);

  const handleStartDebate = () => {
    if (!socket || !isConnected) {
      toast.error("Socket not connected. Please refresh the page.");
      return;
    }
    socket.emit("start_debate", { debateId });
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || isSending || !userId) return;

    setIsSending(true);
    try {
      const res = await fetch(`/api/debates/${debateId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          content: newMessage,
          role: isPro ? "pro" : isCon ? "con" : isJudge ? "judge" : "viewer"
        }),
      });

      if (!res.ok) throw new Error(await res.text());

      const sentMessage = await res.json();
      setMessages(prev => [...prev, sentMessage]);
      setNewMessage("");
    } catch (error) {
      console.error("Send error:", error);
      toast.error("Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  if (connectionError) {
    return (
      <div className="border rounded-lg p-6 text-center space-y-4">
        <div className="text-red-500 font-medium">
          Connection lost. Please refresh the page.
        </div>
        <Button 
          onClick={() => window.location.reload()}
          variant="outline"
        >
          Refresh Page
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="border rounded-lg p-6 flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Debate ID and Con Code Banner - visible only to pro */}
      {isPro && (
        <div className="bg-gray-50 border-b px-4 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">Debate ID:</span>
            <span className="font-mono bg-white border rounded px-2 py-1 text-xs select-all">{debateId}</span>
            <Button size="icon" variant="ghost" onClick={() => {navigator.clipboard.writeText(debateId); toast.success("Debate ID copied!");}}><CopyIcon className="w-4 h-4" /></Button>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">Con Join Code:</span>
            <span className="font-mono bg-white border rounded px-2 py-1 text-xs select-all">{conCode}</span>
            <Button size="icon" variant="ghost" onClick={() => {navigator.clipboard.writeText(conCode); toast.success("Con code copied!");}}><CopyIcon className="w-4 h-4" /></Button>
          </div>
        </div>
      )}

      <div className="p-4 border-b flex justify-between items-center">
        <h2 className="text-xl font-semibold">Debate Room</h2>
        <div className="flex gap-2">
          {isPro && <Badge variant="default">Pro</Badge>}
          {isCon && <Badge variant="destructive">Con</Badge>}
          {isJudge && <Badge variant="secondary">Judge</Badge>}
          {!isPro && !isCon && !isJudge && <Badge variant="outline">Viewer</Badge>}
        </div>
      </div>

      {/* Countdown Timer and Start Button */}
      <div className="mb-4 flex items-center gap-4 justify-center">
        {debateStatus === "waiting" && isPro && (
          <Button onClick={handleStartDebate}>Start Debate</Button>
        )}
        {debateStatus === "in-progress" && (
          <div className="flex items-center gap-2">
            <span className="font-semibold">Time Left:</span>
            <span className="font-mono text-lg">{timeLeft !== null ? `${timeLeft}s` : ""}</span>
          </div>
        )}
        {debateStatus === "completed" && (
          <span className="text-red-600 font-semibold ml-4">Debate Ended</span>
        )}
      </div>

      <ScrollArea className="h-[400px] p-4">
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
                  message.sender.clerkId === user?.id
                    ? "bg-blue-100 ml-auto"
                    : message.role === "pro"
                      ? "bg-green-100"
                      : message.role === "con"
                        ? "bg-red-100"
                        : "bg-gray-100"
                }`}
              >
                <div className="font-medium text-sm flex items-center gap-2">
                  <span>{message.sender.username}</span>
                  <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                    {message.role}
                  </Badge>
                </div>
                <p className="whitespace-pre-wrap mt-1">{message.content}</p>
                <div className="text-xs text-gray-500 mt-1">
                  {new Date(message.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

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

      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={debateStatus === "completed" ? "Debate has ended" : isPro ? "State your argument as Pro..." : isCon ? "Counter the argument as Con..." : "Viewers cannot send messages"}
            disabled={debateStatus !== "in-progress" || (!isPro && !isCon)}
          />
          <Button onClick={handleSendMessage} disabled={debateStatus !== "in-progress" || isSending || !newMessage.trim() || (!isPro && !isCon)}>
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}