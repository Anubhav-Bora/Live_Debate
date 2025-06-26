"use client";
import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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
  isJudge 
}: {
  debateId: string;
  userId?: string;
  isPro?: boolean;
  isCon?: boolean;
  isJudge?: boolean;
}) {
  const { user } = useUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [errorCount, setErrorCount] = useState(0);
  const [connectionError, setConnectionError] = useState(false);

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
      <div className="p-4 border-b flex justify-between items-center">
        <h2 className="text-xl font-semibold">Debate Room</h2>
        <div className="flex gap-2">
          {isPro && <Badge variant="default">Pro</Badge>}
          {isCon && <Badge variant="destructive">Con</Badge>}
          {isJudge && <Badge variant="secondary">Judge</Badge>}
          {!isPro && !isCon && !isJudge && <Badge variant="outline">Viewer</Badge>}
        </div>
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

      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={
              isPro ? "State your argument as Pro..." :
              isCon ? "Counter the argument as Con..." :
              isJudge ? "Provide your judgment..." :
              "Viewers cannot send messages"
            }
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
            disabled={isSending || connectionError || (!isPro && !isCon && !isJudge)}
          />
          <Button
            onClick={handleSendMessage}
            disabled={
              !newMessage.trim() || 
              isSending || 
              connectionError || 
              (!isPro && !isCon && !isJudge)
            }
          >
            {isSending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending
              </>
            ) : (
              "Send"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}