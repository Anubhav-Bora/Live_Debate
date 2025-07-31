"use client"
import { useUser } from "@clerk/nextjs"
import { useParams, useRouter } from "next/navigation"
import { useState, useEffect, useRef } from "react"
import { CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import Link from "next/link"
import VideoDebateRoom from "@/components/VideoDebateRoom"
import { useSocket } from "@/context/SocketContext"
import { ScrollArea } from "@/components/ui/scroll-area"
import { motion } from "framer-motion"
import { AnimatedBackground } from "@/components/ui/animated-background"
import { GlowCard } from "@/components/ui/glow-card"
import { NeonButton } from "@/components/ui/neon-button"
import {
  ArrowLeft,
  Users,
  Clock,
  MessageSquare,
  Brain,
  Zap,
  Play,
  Pause,
  Trophy,
  Target,
  Lightbulb,
  TrendingUp,
  Trash2,
  X,
} from "lucide-react"

interface Debate {
  id: string;
  topic: string;
  status: string;
  duration: number;
  joinCodeCon: string;
  proDisplayName?: string;
  proUser?: {
    clerkId: string;
    username: string;
    id: string;
  };
  conUser?: {
    clerkId: string;
    username: string;
    id: string;
  };
}

interface Message {
  id: string;
  content: string;
  role: string;
  sender?: {
    username: string;
  };
}

interface AIFeedback {
  error?: string;
  message?: string;
  pro?: {
    score?: string;
    mistakes?: string[];
    improvements?: string[];
    feedback?: string;
  };
  con?: {
    score?: string;
    mistakes?: string[];
    improvements?: string[];
    feedback?: string;
  };
}

export default function DebatePage() {
  const params = useParams()
  const id = params?.id as string
  const { user } = useUser()
  const router = useRouter()
  const [debate, setDebate] = useState<Debate | null>(null)
  const [role, setRole] = useState<"pro" | "con" | "viewer">("viewer")
  const [joinCode, setJoinCode] = useState("")
  const [loading, setLoading] = useState(true)
  const { socket, isConnected } = useSocket()
  const [debateStatus, setDebateStatus] = useState<string>("waiting")
  const [timer, setTimer] = useState<number | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [aiFeedback, setAiFeedback] = useState<AIFeedback | null>(null)
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [feedbackLoading, setFeedbackLoading] = useState(false)
  const [feedbackError, setFeedbackError] = useState<string | null>(null)
  const [messagesLoading, setMessagesLoading] = useState(true);
  const timerInterval = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!id) return
    const fetchDebate = async () => {
      try {
        const res = await fetch(`/api/debates/${id}`)
        if (res.ok) {
          const data = await res.json()
          setDebate(data)
          setDebateStatus(data.status || "waiting")
          if (user?.id) {
            if (data.proUser?.clerkId === user.id) {
              setRole("pro")
            } else if (data.conUser?.clerkId === user.id) {
              setRole("con")
            }
          }
        } else {
          setDebate(null)
          toast.error(`Failed to fetch debate: ${res.status}`)
        }
      } catch {
        setDebate(null)
        toast.error("Error fetching debate")
      } finally {
        setLoading(false)
      }
    }
    fetchDebate()
  }, [id, user?.id])

  useEffect(() => {
    if (!socket) return

    const onStarted = ({ duration }: { duration: number }) => {
      console.log("✅ Debate started:", { duration })
      setDebateStatus("in-progress")
      setTimer(duration)
    }

    const onEnded = () => {
      console.log("✅ Debate ended - waiting for AI feedback...")
      setDebateStatus("completed")
      setTimer(0)
      setFeedbackLoading(true)
      setFeedbackError(null)
    }

    const onFeedback = (feedback: AIFeedback) => {
      console.log("✅ AI Feedback received:", feedback)
      setAiFeedback(feedback)
      setFeedbackLoading(false)
      if (feedback?.error && feedback.error !== "Insufficient content") {
        setFeedbackError("AI analysis failed. Please refresh to try again.")
      } else {
        setFeedbackError(null)
      }
    }

    const onError = (error: unknown) => {
      console.error("❌ Socket error:", error)
      if (debateStatus === "completed") {
        setFeedbackLoading(false)
        setFeedbackError("Connection error while loading feedback.")
      }
    }

    socket.on("debate_started", onStarted)
    socket.on("debate_ended", onEnded)
    socket.on("debate_feedback", onFeedback)
    socket.on("error", onError)

    return () => {
      socket.off("debate_started", onStarted)
      socket.off("debate_ended", onEnded)
      socket.off("debate_feedback", onFeedback)
      socket.off("error", onError)
    }
  }, [socket, debateStatus])

  useEffect(() => {
    if (debateStatus === "completed" && feedbackLoading && !aiFeedback) {
      const fallbackTimer = setTimeout(async () => {
        try {
          console.log("⏰ Socket timeout - trying API fallback for feedback...")
          const res = await fetch(`/api/debates/${id}`)
          if (res.ok) {
            const debateData = await res.json()
            if (debateData.aiFeedback) {
              console.log("✅ Fallback feedback received:", debateData.aiFeedback)
              setAiFeedback(debateData.aiFeedback)
              setFeedbackLoading(false)
            } else {
              setFeedbackError("AI feedback is still being generated. Please wait...")
              setTimeout(() => {
                setFeedbackLoading(true)
                setFeedbackError(null)
              }, 5000)
            }
          }
        } catch (error) {
          console.error("❌ Fallback fetch failed:", error)
          setFeedbackError("Failed to load AI feedback. Please refresh the page.")
          setFeedbackLoading(false)
        }
      }, 10000)

      return () => clearTimeout(fallbackTimer)
    }
  }, [debateStatus, feedbackLoading, aiFeedback, id])

  useEffect(() => {
    if (!id) return
    const fetchMessages = async () => {
      setMessagesLoading(true);
      try {
        const res = await fetch(`/api/debates/${id}/messages`)
        if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`)
        const data = await res.json()
        setMessages(data)
      } catch {
        console.log("Error fetching messages")
      } finally {
        setMessagesLoading(false);
      }
    }
    fetchMessages()
    const interval = setInterval(fetchMessages, 5000)
    return () => clearInterval(interval)
  }, [id])

  useEffect(() => {
    if (debateStatus !== "in-progress" || !timer) return
    setTimeLeft(timer)
    if (timerInterval.current) clearInterval(timerInterval.current)
    timerInterval.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null) return null
        if (prev <= 1) {
          setDebateStatus("completed")
          clearInterval(timerInterval.current as NodeJS.Timeout)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => {
      if (timerInterval.current) clearInterval(timerInterval.current)
    }
  }, [debateStatus, timer])

  const [joinLoading, setJoinLoading] = useState(false);
  const handleJoin = async (action: "join_con") => {
    if (!user?.id || !id) return
    setJoinLoading(true);
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
      })
      if (res.ok) {
        const data = await res.json()
        setDebate(data)
        setRole("con")
        toast.success("Joined as Con")
      } else {
        let errorMsg = "Failed to join"
        try {
          const errorData = await res.json()
          errorMsg = errorData.error || errorMsg
        } catch {
          console.error("Error parsing error response")
        }
        toast.error(errorMsg)
      }
    } catch {
      toast.error("An error occurred while joining")
    } finally {
      setJoinLoading(false);
    }
  }

  const [startLoading, setStartLoading] = useState(false);
  const handleStartDebate = () => {
    if (!socket || !isConnected) {
      toast.error("Socket not connected. Please refresh the page.")
      return
    }
    setStartLoading(true);
    socket.emit("start_debate", { debateId: id })
  }

  const handleRemoveParticipant = async () => {
    if (!user?.id || !id || !debate) return;
    if (debate.proUser?.clerkId !== user.id) {
      toast.error("Only the debate creator can remove participants");
      return;
    }
    if (!confirm("Are you sure you want to remove the Con participant?")) {
      return;
    }
    try {
      const res = await fetch(`/api/debates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, action: "remove_con" })
      });
      if (res.ok) {
        const updatedDebate = await res.json();
        setDebate(updatedDebate);
        toast.success("Con participant removed");
      } else {
        const errorData = await res.json();
        toast.error(errorData.error || "Failed to remove participant");
      }
    } catch {
      toast.error("An error occurred while removing the participant");
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || isSending || !user?.id) return
    setIsSending(true)
    try {
      const res = await fetch(`/api/debates/${id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          content: newMessage,
          role,
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      setNewMessage("")
    } catch {
      toast.error("Failed to send message")
    } finally {
      setIsSending(false)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "waiting":
        return "from-yellow-500 to-orange-500"
      case "in-progress":
        return "from-green-500 to-emerald-500"
      case "completed":
        return "from-blue-500 to-indigo-500"
      default:
        return "from-gray-500 to-gray-600"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "waiting":
        return <Clock className="w-5 h-5" />
      case "in-progress":
        return <Play className="w-5 h-5" />
      case "completed":
        return <Trophy className="w-5 h-5" />
      default:
        return <Pause className="w-5 h-5" />
    }
  }

  const handleDeleteDebate = async () => {
    if (!user?.id || !id) return
    if (debate?.proUser?.clerkId !== user.id) {
      toast.error("Only the debate creator can delete this debate")
      return
    }
    if (!confirm("Are you sure you want to delete this debate? This action cannot be undone.")) {
      return
    }
    try {
      const res = await fetch(`/api/debates/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
        }),
      })
      if (res.ok) {
        toast.success("Debate deleted successfully")
        router.push("/debates")
      } else {
        const errorData = await res.json()
        toast.error(errorData.error || "Failed to delete debate")
      }
    } catch {
      toast.error("An error occurred while deleting the debate")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <AnimatedBackground />
        <div className="relative z-10 container mx-auto px-4 py-8 flex items-center justify-center min-h-screen">
          <GlowCard>
            <div className="flex items-center space-x-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
              <span className="text-white text-lg">Loading debate arena...</span>
            </div>
          </GlowCard>
        </div>
      </div>
    )
  }

  if (!debate) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <AnimatedBackground />
        <div className="relative z-10 container mx-auto px-4 py-8 flex items-center justify-center min-h-screen">
          <GlowCard className="text-center">
            <div className="text-red-400 text-xl font-bold mb-4">Debate Not Found</div>
            <p className="text-gray-300 mb-6">The debate you&apos;re looking for doesn&apos;t exist or failed to load.</p>
            <Link href="/debates">
              <NeonButton>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Debates
              </NeonButton>
            </Link>
          </GlowCard>
        </div>
      </div>
    )
  }

  const isDev = process.env.NODE_ENV !== "production"
  return (
    <div className="min-h-screen relative overflow-hidden">
      <AnimatedBackground />
      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4"
        >
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 leading-tight">{debate.topic}</h1>
            <div className="flex items-center gap-4">
            <Badge className={`bg-gradient-to-r ${getStatusColor(debateStatus)} text-white px-3 py-1`}>
            {getStatusIcon(debateStatus)}
            <span className="ml-2 capitalize">{debateStatus.replace("-", " ")}</span>
            </Badge>
            <div className="flex items-center gap-2">
                <span className="text-gray-400 text-sm">Debate ID:</span>
                  <code className="bg-gray-800/50 px-2 py-1 rounded text-white text-sm font-mono border border-gray-600">
                    {id}
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(id as string);
                    }}
                    className="text-gray-400 text-xs"
                    title="Copy Debate ID"
                  >
                    📋
                  </button>
                </div>
              </div>
          </div>
          <div className="flex gap-3">
            <NeonButton variant="outline" onClick={() => router.push("/debates")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Arena
            </NeonButton>
            {debate.proUser?.clerkId === user?.id && (
              <NeonButton
                variant="outline"
                onClick={handleDeleteDebate}
                className="bg-red-500/20 border-red-500/30 text-red-300"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Debate
              </NeonButton>
            )}
          </div>
        </motion.div>
        {/* Debug Info for Development */}
        {isDev && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6">
            <GlowCard className="bg-yellow-500/10 border-yellow-500/30">
              <div className="text-yellow-300 text-sm">
                <div>
                  <strong>Debug:</strong> Join code for Con: <span className="font-mono">{debate.joinCodeCon}</span>
                </div>
                <div>
                  Debate ID: <span className="font-mono">{debate.id}</span>
                </div>
              </div>
            </GlowCard>
          </motion.div>
        )}
        {/* Participants Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8"
        >
          {/* Pro Participant */}
          <GlowCard glowColor="rgba(34, 197, 94, 0.3)">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-green-400">Pro Position</h3>
              <Target className="w-6 h-6 text-green-400" />
            </div>
            {debate.proUser ? (
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center text-white font-bold text-lg">
                  {(debate.proDisplayName ?? debate.proUser.username).charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="text-white font-semibold">{debate.proDisplayName ?? debate.proUser.username}</div>
                  {debate.proUser.clerkId === user?.id && (
                    <Badge className="bg-green-500/20 text-green-300 border-green-500/30">You</Badge>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-gray-400 italic">Waiting for Pro participant...</div>
            )}
          </GlowCard>
          {/* Con Participant */}
          <GlowCard glowColor="rgba(239, 68, 68, 0.3)" className="relative">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-red-400">Con Position</h3>
              <Zap className="w-6 h-6 text-red-400" />
            </div>
            {debate.conUser ? (
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-red-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg">
                  {debate.conUser.username.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="text-white font-semibold">{debate.conUser.username}</div>
                  {debate.conUser.clerkId === user?.id && (
                    <Badge className="bg-red-500/20 text-red-300 border-red-500/30">You</Badge>
                  )}
                </div>
                {debate.proUser?.clerkId === user?.id && (
                  <button
                    onClick={handleRemoveParticipant}
                    className="p-1 rounded-full bg-red-500/20 border border-red-500/30 text-red-300"
                    title="Remove Con participant"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ) : (
              <div className="text-gray-400 italic">Waiting for Con participant...</div>
            )}
          </GlowCard>
        </motion.div>
        {/* Timer Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-8"
        >
          <GlowCard className="text-center">
            <div className="flex items-center justify-center gap-4 mb-4">
              <Clock className="w-8 h-8 text-indigo-400" />
              <h3 className="text-2xl font-bold text-white">Debate Timer</h3>
            </div>
            <div className="text-4xl md:text-6xl font-mono font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 mb-2">
              {debateStatus === "in-progress" && timeLeft !== null ? formatTime(timeLeft) : formatTime(debate.duration)}
            </div>
            {debateStatus === "completed" && <div className="text-red-400 font-semibold text-lg">Debate Concluded</div>}
            {debateStatus === "waiting" && (
              <div className="text-yellow-400 font-semibold text-lg">Preparing to Begin</div>
            )}
          </GlowCard>
        </motion.div>
        {/* Join Section for Viewers */}
        {role === "viewer" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-8"
          >
            <GlowCard>
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-white flex items-center gap-2">
                  <Users className="w-6 h-6" />
                  Join the Debate
                </CardTitle>
                <CardDescription className="text-gray-300">Participate as Con or observe as a Viewer</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    <span className="text-blue-300 font-medium text-sm">How to Join</span>
                  </div>
                  <div className="text-gray-300 text-sm space-y-1">
                    <div>• <strong>Debate ID</strong> (above) = View this debate as spectator</div>
                    <div>• <strong>Con Code</strong> (from creator) = Join as Con participant</div>
                  </div>
                </div>

                {!debate.conUser && (
                  <div>
                    <Label className="text-white font-semibold mb-2 block">Join as Con Participant</Label>
                    <div className="flex gap-3">
                      <Input
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value)}
                        placeholder={isDev ? `Enter con join code (see above)` : "Enter con join code"}
                        className="bg-white/5 border-white/20 text-white placeholder:text-gray-400"
                      />
                      <NeonButton
                        onClick={() => handleJoin("join_con")}
                        disabled={!joinCode.trim() || !!debate.conUser || joinLoading}
                      >
                        {joinLoading ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        ) : null}
                        Join as Con
                      </NeonButton>
                    </div>
                    <div className="text-xs text-gray-400 mt-2">Enter the exact join code provided by the debate creator</div>
                  </div>
                )}
                <div>
                  <Label className="text-white font-semibold mb-2 block">Or observe the debate</Label>
                  <NeonButton variant="outline" onClick={() => setRole("viewer")}>
                    <Users className="w-4 h-4 mr-2" />
                    Join as Viewer
                  </NeonButton>
                  <div className="text-xs text-gray-400 mt-2">You&apos;re currently viewing with the Debate ID</div>
                </div>
              </CardContent>
            </GlowCard>
          </motion.div>
        )}
        {/* Video Debate Room */}
        {id && (role === "pro" || role === "con") && user?.id && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mb-8"
          >
            {role === "pro" && debateStatus === "waiting" && (
              <div className="mb-6 flex justify-center">
                <NeonButton onClick={handleStartDebate} disabled={!isConnected || startLoading} size="lg">
                  {startLoading ? (
                    <div className="animate-spin rounded-full h-5 w-5 mr-2"></div>
                  ) : (
                    <Play className="w-5 h-5 mr-2" />
                  )}
                  Launch Debate
                </NeonButton>
              </div>
            )}
            <GlowCard className="p-0 overflow-hidden">
              <VideoDebateRoom debateId={id} userId={user.id} role={role} />
            </GlowCard>
            {/* Chat Section */}
            <GlowCard className="mt-6">
              <div className="flex items-center gap-2 p-4 border-b border-white/10">
                <MessageSquare className="w-5 h-5 text-indigo-400" />
                <h3 className="font-semibold text-white">Live Discussion</h3>
              </div>
              <ScrollArea className="h-64 p-4">
                {messagesLoading ? (
                  <div className="flex justify-center items-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                    <span className="ml-2 text-gray-400">Loading messages...</span>
                  </div>
                ) : (
                  messages.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No messages yet. Start the conversation!</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {messages.map((message) => (
                        <motion.div
                          key={message.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className={`p-3 rounded-lg max-w-[80%] ${
                            message.role === "pro"
                              ? "bg-green-500/20 border border-green-500/30"
                              : message.role === "con"
                                ? "bg-red-500/20 border border-red-500/30"
                                : "bg-gray-500/20 border border-gray-500/30"
                          }`}
                        >
                          <div className="font-medium text-sm flex items-center gap-2 mb-1">
                            <span className="text-white">{message.sender?.username || message.role}</span>
                            <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                              {message.role}
                            </Badge>
                          </div>
                          <p className="whitespace-pre-wrap text-gray-200">{message.content}</p>
                        </motion.div>
                      ))}
                    </div>
                  )
                )}
              </ScrollArea>
              <div className="p-4 border-t border-white/10 flex gap-3">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={
                    debateStatus === "completed"
                      ? "Debate has ended"
                      : role === "pro"
                        ? "State your argument as Pro..."
                        : role === "con"
                          ? "Counter the argument as Con..."
                          : "Viewers cannot send messages"
                  }
                  disabled={debateStatus !== "in-progress" || !(role === "pro" || role === "con") || isSending}
                  className="bg-white/5 border-white/20 text-white placeholder:text-gray-400"
                />
                <NeonButton
                  onClick={handleSendMessage}
                  disabled={
                    debateStatus !== "in-progress" ||
                    isSending ||
                    !newMessage.trim() ||
                    !(role === "pro" || role === "con")
                  }
                >
                  {isSending ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : null}
                  Send
                </NeonButton>
              </div>
            </GlowCard>
          </motion.div>
        )}
        {/* AI Feedback after debate ends */}
        {debateStatus === "completed" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-6">
            <GlowCard glowColor="rgba(139, 92, 246, 0.4)">
              <div className="flex items-center gap-2 mb-6">
                <Brain className="w-6 h-6 text-purple-400" />
                <h3 className="text-2xl font-bold text-white">AI Performance Analysis</h3>
              </div>

              {feedbackLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
                  <p className="text-gray-300 text-lg">Analyzing debate performance...</p>
                  <p className="text-gray-400 text-sm mt-2">Our AI is reviewing the arguments and providing detailed feedback</p>
                  <div className="mt-4 flex items-center justify-center gap-2">
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                  </div>
                </div>
              ) : feedbackError ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                    <span className="text-red-400 text-2xl">⚠️</span>
                  </div>
                  <p className="text-red-300 text-lg mb-2">Feedback Unavailable</p>
                  <p className="text-gray-400 text-sm mb-4">{feedbackError}</p>
                  <NeonButton
                    onClick={() => {
                      setFeedbackError(null)
                      setFeedbackLoading(true)
                    }}
                    variant="outline"
                  >
                    Try Again
                  </NeonButton>
                </div>
              ) : aiFeedback && (
                (aiFeedback.message || aiFeedback.error) ||
                (aiFeedback.pro?.feedback === 'No content to analyze' && aiFeedback.con?.feedback === 'No content to analyze')
              ) ? (
                <div className="text-center py-12">
                  <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg text-gray-300 font-semibold">
                    {aiFeedback.message || aiFeedback.error || 'Not enough debate content for AI analysis.'}
                  </p>
                </div>
              ) : aiFeedback && aiFeedback.pro && aiFeedback.con ? (
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Pro Feedback */}
                  <div className="space-y-4">
                    <h4 className="text-xl font-semibold text-green-400 flex items-center gap-2">
                      <Target className="w-5 h-5" />
                      Pro Analysis
                    </h4>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-yellow-400" />
                        <span className="text-gray-300">Score:</span>
                        <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30">
                          {aiFeedback.pro?.score ?? "N/A"}/10
                        </Badge>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp className="w-4 h-4 text-red-400" />
                          <span className="text-gray-300 font-medium">Areas for Improvement:</span>
                        </div>
                        <div className="text-gray-400 text-sm">
                          {aiFeedback.pro?.mistakes && aiFeedback.pro.mistakes.length > 0 ? (
                            <ul className="list-disc list-inside space-y-1">
                              {aiFeedback.pro.mistakes.map((mistake, i) => (
                                <li key={i}>{mistake}</li>
                              ))}
                            </ul>
                          ) : (
                            "None identified"
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Lightbulb className="w-4 h-4 text-blue-400" />
                          <span className="text-gray-300 font-medium">Suggestions:</span>
                        </div>
                        <div className="text-gray-400 text-sm">
                          {aiFeedback.pro?.improvements && aiFeedback.pro.improvements.length > 0 ? (
                            <ul className="list-disc list-inside space-y-1">
                              {aiFeedback.pro.improvements.map((improvement, i) => (
                                <li key={i}>{improvement}</li>
                              ))}
                            </ul>
                          ) : (
                            "Keep up the great work!"
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Brain className="w-4 h-4 text-purple-400" />
                          <span className="text-gray-300 font-medium">Detailed Feedback:</span>
                        </div>
                        <p className="text-gray-400 text-sm">
                          {aiFeedback.pro?.feedback ?? "No detailed feedback available"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Con Feedback */}
                  <div className="space-y-4">
                    <h4 className="text-xl font-semibold text-red-400 flex items-center gap-2">
                      <Zap className="w-5 h-5" />
                      Con Analysis
                    </h4>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-yellow-400" />
                        <span className="text-gray-300">Score:</span>
                        <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30">
                          {aiFeedback.con?.score ?? "N/A"}/10
                        </Badge>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp className="w-4 h-4 text-red-400" />
                          <span className="text-gray-300 font-medium">Areas for Improvement:</span>
                        </div>
                        <div className="text-gray-400 text-sm">
                          {aiFeedback.con?.mistakes && aiFeedback.con.mistakes.length > 0 ? (
                            <ul className="list-disc list-inside space-y-1">
                              {aiFeedback.con.mistakes.map((mistake, i) => (
                                <li key={i}>{mistake}</li>
                              ))}
                            </ul>
                          ) : (
                            "None identified"
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Lightbulb className="w-4 h-4 text-blue-400" />
                          <span className="text-gray-300 font-medium">Suggestions:</span>
                        </div>
                        <div className="text-gray-400 text-sm">
                          {aiFeedback.con?.improvements && aiFeedback.con.improvements.length > 0 ? (
                            <ul className="list-disc list-inside space-y-1">
                              {aiFeedback.con.improvements.map((improvement, i) => (
                                <li key={i}>{improvement}</li>
                              ))}
                            </ul>
                          ) : (
                            "Keep up the great work!"
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Brain className="w-4 h-4 text-purple-400" />
                          <span className="text-gray-300 font-medium">Detailed Feedback:</span>
                        </div>
                        <p className="text-gray-400 text-sm">
                          {aiFeedback.con?.feedback ?? "No detailed feedback available"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : aiFeedback && aiFeedback.message ? (
                <div className="text-center py-12">
                  <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg text-gray-300 font-semibold">{aiFeedback.message}</p>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>AI feedback will appear here once the debate concludes.</p>
                </div>
              )}
            </GlowCard>
          </motion.div>
        )}
        {/* Viewer Message */}
        {id && role === "viewer" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <GlowCard className="text-center py-12">
              <Users className="w-16 h-16 mx-auto mb-4 text-indigo-400 opacity-50" />
              <h3 className="text-2xl font-bold text-white mb-4">Spectator Mode</h3>
              <p className="text-gray-300 text-lg mb-6">
                Only Pro and Con participants can join the live video debate.
              </p>
              <p className="text-gray-400">Please wait for the debate to finish to see the AI feedback and analysis.</p>
            </GlowCard>
          </motion.div>
        )}
      </div>
    </div>
  )
}
