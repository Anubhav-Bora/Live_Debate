"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowLeft,
  Brain,
  CheckCircle2,
  Clock3,
  Copy,
  Crown,
  Loader2,
  LockKeyhole,
  MessageSquare,
  Play,
  Radio,
  Send,
  ShieldCheck,
  Target,
  Trash2,
  Trophy,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { AnimatedBackground } from "@/components/ui/animated-background";
import { GlowCard } from "@/components/ui/glow-card";
import { NeonButton } from "@/components/ui/neon-button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import VideoDebateRoom from "@/components/VideoDebateRoom";
import { useSocket } from "@/context/SocketContext";

type DebateStatus = "waiting" | "in-progress" | "completed";
type Role = "pro" | "con" | "viewer";

interface DebateUser {
  id: string;
  username: string;
}

interface ParticipantResult {
  joined?: boolean;
  score?: number | null;
  logic?: number;
  clarity?: number;
  persuasiveness?: number;
  tone?: number;
  mistakes?: string[];
  improvements?: string[];
  feedback?: string;
}

interface DebateFeedback {
  status?: "completed" | "failed" | "insufficient";
  winner?: "pro" | "con" | "tie" | null;
  summary?: string;
  message?: string;
  confidence?: number;
  pro?: ParticipantResult;
  con?: ParticipantResult;
}

interface Debate {
  id: string;
  topic: string;
  status: DebateStatus;
  analysisStatus: string;
  duration: number;
  startTime?: string | null;
  endTime?: string | null;
  isPublic: boolean;
  joinCodeCon?: string;
  proDisplayName?: string | null;
  proUser: DebateUser;
  conUser?: DebateUser | null;
  aiFeedback?: DebateFeedback | null;
  winner?: "pro" | "con" | "tie" | null;
  viewerRole: Role;
  canDelete: boolean;
}

interface DebateMessage {
  id: string;
  content: string;
  role: string;
  createdAt: string;
  sender: { id: string; username: string };
}

export default function DebatePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, isLoaded: userLoaded } = useAuth();
  const { socket, isConnected } = useSocket();
  const [debate, setDebate] = useState<Debate | null>(null);
  const [role, setRole] = useState<Role>("viewer");
  const [messages, setMessages] = useState<DebateMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [starting, setStarting] = useState(false);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);
  const [feedback, setFeedback] = useState<DebateFeedback | null>(null);
  const [analysisStatus, setAnalysisStatus] = useState("idle");
  const [retrying, setRetrying] = useState(false);
  const [presence, setPresence] = useState({ proReady: false, conReady: false });

  const loadDebate = useCallback(async () => {
    const response = await fetch(`/api/debates/${id}`, { cache: "no-store" });
    if (!response.ok) throw new Error(response.status === 404 ? "Debate not found" : "Could not load debate");
    const data = (await response.json()) as Debate;
    setDebate(data);
    setFeedback(data.aiFeedback || null);
    setAnalysisStatus(data.analysisStatus || "idle");
    setRole(data.viewerRole);
    return data;
  }, [id]);

  const loadMessages = useCallback(async () => {
    const response = await fetch(`/api/debates/${id}/messages`, { cache: "no-store" });
    if (response.ok) setMessages(await response.json());
  }, [id]);

  useEffect(() => {
    if (!id || !userLoaded) return;
    Promise.all([loadDebate(), loadMessages()])
      .catch((error) => toast.error(error instanceof Error ? error.message : "Could not load debate"))
      .finally(() => setLoading(false));
  }, [id, loadDebate, loadMessages, userLoaded]);

  useEffect(() => {
    if (!socket || !id || !userLoaded) return;
    const joinRoom = () => socket.emit("join_debate", { debateId: id });
    const onState = (state: {
      status: DebateStatus;
      startTime?: string;
      duration: number;
      role: Role;
      analysisStatus?: string;
      aiFeedback?: DebateFeedback;
    }) => {
      setRole(state.role);
      setAnalysisStatus(state.analysisStatus || "idle");
      if (state.aiFeedback) setFeedback(state.aiFeedback);
      setDebate((current) => current ? {
        ...current,
        status: state.status,
        startTime: state.startTime || current.startTime,
        duration: state.duration,
      } : current);
    };
    const onStarted = ({ startTime, duration }: { startTime: string; duration: number }) => {
      setStarting(false);
      setFeedback(null);
      setAnalysisStatus("idle");
      setDebate((current) => current ? { ...current, status: "in-progress", startTime, duration } : current);
      toast.success("Debate is live. Transcription has started.");
    };
    const onEnded = () => {
      setDebate((current) => current ? { ...current, status: "completed" } : current);
      setAnalysisStatus("analyzing");
      setTimeLeft(0);
    };
    const onFeedback = (result: DebateFeedback) => {
      setFeedback(result);
      setAnalysisStatus(result.status === "failed" ? "failed" : "completed");
      setDebate((current) => current ? { ...current, winner: result.winner, aiFeedback: result } : current);
    };
    const onMessage = (message: DebateMessage) => {
      setMessages((current) => current.some((item) => item.id === message.id) ? current : [...current, message]);
    };
    const onPresence = (next: { proReady: boolean; conReady: boolean }) => setPresence(next);
    const onAppError = ({ message }: { message?: string }) => {
      setStarting(false);
      if (message) toast.error(message);
    };

    socket.on("connect", joinRoom);
    socket.on("debate_state", onState);
    socket.on("debate_started", onStarted);
    socket.on("debate_ended", onEnded);
    socket.on("debate_feedback", onFeedback);
    socket.on("new_message", onMessage);
    socket.on("presence_update", onPresence);
    socket.on("app_error", onAppError);
    if (isConnected) joinRoom();
    return () => {
      socket.off("connect", joinRoom);
      socket.off("debate_state", onState);
      socket.off("debate_started", onStarted);
      socket.off("debate_ended", onEnded);
      socket.off("debate_feedback", onFeedback);
      socket.off("new_message", onMessage);
      socket.off("presence_update", onPresence);
      socket.off("app_error", onAppError);
    };
  }, [id, isConnected, socket, userLoaded]);

  useEffect(() => {
    if (debate?.status !== "in-progress" || !debate.startTime) {
      setTimeLeft(debate?.status === "waiting" ? debate.duration : 0);
      return;
    }
    const updateTimer = () => {
      const endsAt = new Date(debate.startTime as string).getTime() + debate.duration * 1_000;
      setTimeLeft(Math.max(0, Math.ceil((endsAt - Date.now()) / 1_000)));
    };
    updateTimer();
    const timer = setInterval(updateTimer, 1_000);
    return () => clearInterval(timer);
  }, [debate?.duration, debate?.startTime, debate?.status]);

  useEffect(() => {
    if (debate?.status !== "completed" || analysisStatus !== "analyzing") return;
    const poll = setInterval(() => {
      loadDebate().catch(() => undefined);
    }, 4_000);
    return () => clearInterval(poll);
  }, [analysisStatus, debate?.status, loadDebate]);

  const canStart = role === "pro" && presence.proReady && presence.conReady && debate?.status === "waiting";
  const formattedTime = useMemo(() => {
    const minutes = Math.floor(timeLeft / 60);
    return `${minutes}:${String(timeLeft % 60).padStart(2, "0")}`;
  }, [timeLeft]);

  const joinAsCon = async () => {
    if (!joinCode.trim()) return;
    setJoining(true);
    try {
      const response = await fetch(`/api/debates/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "join_con", joinCode }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not join debate");
      setDebate(data);
      setRole("con");
      setJoinCode("");
      socket?.emit("join_debate", { debateId: id });
      toast.success("You joined the Con side.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not join debate");
    } finally {
      setJoining(false);
    }
  };

  const startDebate = () => {
    if (!socket || !isConnected) return toast.error("Realtime connection is still reconnecting.");
    setStarting(true);
    socket.timeout(8_000).emit("start_debate", { debateId: id }, (error: Error | null, result?: { ok: boolean; error?: string }) => {
      if (error || !result?.ok) {
        setStarting(false);
        toast.error(result?.error || "The debate could not be started.");
      }
    });
  };

  const endDebate = () => {
    if (!socket || !confirm("End the debate now and send the recorded arguments for judging?")) return;
    socket.emit("end_debate", { debateId: id });
  };

  const sendMessage = () => {
    const content = newMessage.trim();
    if (!socket || !content || sending) return;
    setSending(true);
    socket.timeout(8_000).emit("send_message", { debateId: id, content }, (error: Error | null, result?: { ok: boolean; error?: string }) => {
      setSending(false);
      if (error || !result?.ok) toast.error(result?.error || "Message could not be sent.");
      else setNewMessage("");
    });
  };

  const removeCon = async () => {
    if (!confirm("Remove the current Con participant?")) return;
    const response = await fetch(`/api/debates/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "remove_con" }),
    });
    const data = await response.json();
    if (!response.ok) return toast.error(data.error || "Could not remove participant");
    setDebate(data);
    socket?.emit("join_debate", { debateId: id });
    toast.success("Con participant removed.");
  };

  const deleteDebate = async () => {
    if (!confirm("Delete this debate and all of its messages and scores?")) return;
    const response = await fetch(`/api/debates/${id}`, { method: "DELETE" });
    const data = await response.json();
    if (!response.ok) return toast.error(data.error || "Could not delete debate");
    toast.success("Debate deleted.");
    router.push("/debates");
  };

  const retryAnalysis = async () => {
    setRetrying(true);
    setAnalysisStatus("analyzing");
    try {
      const response = await fetch(`/api/debates/${id}/ai-feedback`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Analysis failed");
      setFeedback(data);
      setAnalysisStatus("completed");
      toast.success("Analysis updated.");
    } catch (error) {
      setAnalysisStatus("failed");
      toast.error(error instanceof Error ? error.message : "Analysis failed");
    } finally {
      setRetrying(false);
    }
  };

  if (loading) return <LoadingState />;
  if (!debate) return <NotFoundState onBack={() => router.push("/debates")} />;

  return (
    <div className="min-h-screen overflow-hidden">
      <AnimatedBackground />
      <div className="relative z-10 mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
        <motion.header initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="mb-7">
          <button onClick={() => router.push("/debates")} className="mb-4 inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Back to arenas
          </button>
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div className="max-w-4xl">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <StatusBadge status={debate.status} />
                <Badge variant="outline" className="border-white/10 bg-white/5 text-slate-300">
                  {debate.isPublic ? <Users className="mr-1.5 h-3.5 w-3.5" /> : <LockKeyhole className="mr-1.5 h-3.5 w-3.5" />}
                  {debate.isPublic ? "Public arena" : "Private arena"}
                </Badge>
                <span className={`inline-flex items-center gap-1.5 text-xs ${isConnected ? "text-emerald-300" : "text-amber-300"}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${isConnected ? "bg-emerald-400" : "animate-pulse bg-amber-400"}`} />
                  {isConnected ? "Realtime connected" : "Reconnecting"}
                </span>
              </div>
              <h1 className="font-editorial text-balance text-3xl leading-tight tracking-[-0.025em] text-[#f4f3ef] sm:text-5xl">{debate.topic}</h1>
              <button
                onClick={() => navigator.clipboard.writeText(id).then(() => toast.success("Arena ID copied"))}
                className="mt-3 inline-flex items-center gap-2 font-mono text-xs text-slate-500 transition hover:text-slate-300"
              >
                {id} <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
            {role === "pro" && debate.status !== "in-progress" && (
              <button onClick={deleteDebate} className="inline-flex items-center gap-2 self-start rounded-xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-200 transition hover:bg-rose-500/20">
                <Trash2 className="h-4 w-4" /> Delete arena
              </button>
            )}
          </div>
        </motion.header>

        <div className="mb-6 grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-stretch">
          <ParticipantCard side="pro" user={debate.proUser} isCurrent={role === "pro"} ready={presence.proReady} />
          <GlowCard className="flex min-w-48 items-center justify-center p-5 text-center">
            <div>
              <Clock3 className={`mx-auto mb-2 h-5 w-5 ${debate.status === "in-progress" ? "text-emerald-300" : "text-[#829ee3]"}`} />
              <div className="font-mono text-4xl font-bold tabular-nums text-white">{formattedTime}</div>
              <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">
                {debate.status === "waiting" ? "Ready room" : debate.status === "in-progress" ? "Time remaining" : "Finished"}
              </p>
            </div>
          </GlowCard>
          <ParticipantCard side="con" user={debate.conUser || null} isCurrent={role === "con"} ready={presence.conReady} onRemove={role === "pro" && debate.status === "waiting" && debate.conUser ? removeCon : undefined} />
        </div>

        {role === "viewer" && debate.status === "waiting" && !debate.conUser && user && (
          <GlowCard className="mb-6 border-[#425a8f]">
            <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-end">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#829ee3]">Open Con position</p>
                <h2 className="mt-2 text-xl font-semibold text-white">Have an invitation code?</h2>
                <p className="mt-1 text-sm text-slate-400">Join the opposing side. The code is checked securely and is never exposed to spectators.</p>
              </div>
              <div className="flex gap-2">
                <Input value={joinCode} onChange={(event) => setJoinCode(event.target.value.toUpperCase())} maxLength={8} placeholder="8-character code" className="h-11 bg-white/5 font-mono uppercase text-white" />
                <NeonButton onClick={joinAsCon} disabled={joining || joinCode.length !== 8}>
                  {joining ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Join Con
                </NeonButton>
              </div>
            </div>
          </GlowCard>
        )}

        {role === "pro" && debate.joinCodeCon && debate.status === "waiting" && !debate.conUser && (
          <GlowCard className="mb-6 border-[#425a8f]">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#829ee3]">Opponent invitation</p>
                <p className="mt-1 text-sm text-slate-400">Share this private code only with your intended Con participant.</p>
              </div>
              <button onClick={() => navigator.clipboard.writeText(debate.joinCodeCon as string).then(() => toast.success("Join code copied"))} className="inline-flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-mono text-lg font-bold tracking-[0.22em] text-white transition hover:bg-white/10">
                {debate.joinCodeCon} <Copy className="h-4 w-4 text-[#829ee3]" />
              </button>
            </div>
          </GlowCard>
        )}

        {(role === "pro" || role === "con") && user && (
          <GlowCard className="mb-6 overflow-hidden p-0">
            <VideoDebateRoom debateId={id} userId={user.id} role={role} isDebateActive={debate.status === "in-progress"} />
          </GlowCard>
        )}

        {debate.status === "waiting" && role === "pro" && (
          <div className="mb-6 flex flex-col items-center gap-3 text-center">
            <NeonButton onClick={startDebate} disabled={!canStart || starting} size="lg">
              {starting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Play className="mr-2 h-5 w-5" />}
              Start debate
            </NeonButton>
            <p className="text-sm text-slate-400">
              {!debate.conUser ? "Waiting for a Con participant." : !presence.proReady || !presence.conReady ? "Both participants must start camera and microphone first." : "Both sides are ready."}
            </p>
          </div>
        )}

        {debate.status === "in-progress" && role === "pro" && (
          <div className="mb-6 flex justify-center">
            <button onClick={endDebate} className="rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/20">End debate early</button>
          </div>
        )}

        {(role === "pro" || role === "con") && (
          <DiscussionPanel messages={messages} role={role} status={debate.status} value={newMessage} sending={sending} onChange={setNewMessage} onSend={sendMessage} />
        )}

        {role === "viewer" && debate.status !== "completed" && (
          <GlowCard className="text-center">
            <Radio className="mx-auto mb-3 h-7 w-7 text-[#829ee3]" />
            <h2 className="text-xl font-semibold text-white">Spectator view</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-slate-400">You’ll see the timer, participant readiness, and the final AI judgement update here in real time.</p>
          </GlowCard>
        )}

        {debate.status === "completed" && (
          <ResultsPanel feedback={feedback} status={analysisStatus} retrying={retrying} canRetry={role === "pro" || role === "con"} onRetry={retryAnalysis} />
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: DebateStatus }) {
  const config = status === "in-progress"
    ? { label: "Live", className: "border-emerald-400/30 bg-emerald-500/15 text-emerald-200", icon: <Radio className="mr-1.5 h-3.5 w-3.5 animate-pulse" /> }
    : status === "completed"
      ? { label: "Completed", className: "border-[#5874ad] bg-[#1a2945] text-[#b5c6f2]", icon: <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> }
      : { label: "Waiting", className: "border-amber-400/30 bg-amber-500/15 text-amber-200", icon: <Clock3 className="mr-1.5 h-3.5 w-3.5" /> };
  return <Badge variant="outline" className={config.className}>{config.icon}{config.label}</Badge>;
}

function ParticipantCard({ side, user, isCurrent, ready, onRemove }: { side: "pro" | "con"; user: DebateUser | null; isCurrent: boolean; ready: boolean; onRemove?: () => void }) {
  const pro = side === "pro";
  return (
    <GlowCard glowColor={pro ? "rgba(16,185,129,.2)" : "rgba(244,63,94,.2)"} className="p-5">
      <div className="flex items-center gap-4">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border text-lg font-bold ${pro ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-200" : "border-rose-400/25 bg-rose-500/10 text-rose-200"}`}>
          {user?.username.charAt(0).toUpperCase() || <UserRound className="h-5 w-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2"><span className={`text-xs font-bold uppercase tracking-[0.2em] ${pro ? "text-emerald-300" : "text-rose-300"}`}>{side}</span>{isCurrent && <Badge variant="outline" className="h-5 border-white/10 text-[10px] text-slate-300">You</Badge>}</div>
          <p className="mt-1 truncate font-semibold text-white">{user?.username || "Position open"}</p>
          {user && <p className={`mt-1 text-xs ${ready ? "text-emerald-300" : "text-slate-500"}`}>{ready ? "Camera ready" : "Not media-ready"}</p>}
        </div>
        {onRemove && <button onClick={onRemove} className="rounded-lg p-2 text-slate-500 transition hover:bg-rose-500/10 hover:text-rose-300" title="Remove participant"><X className="h-4 w-4" /></button>}
      </div>
    </GlowCard>
  );
}

function DiscussionPanel({ messages, role, status, value, sending, onChange, onSend }: { messages: DebateMessage[]; role: Role; status: DebateStatus; value: string; sending: boolean; onChange: (value: string) => void; onSend: () => void }) {
  return (
    <GlowCard className="mb-6 p-0">
      <div className="flex items-center gap-2 border-b border-[#282e38] px-5 py-4"><MessageSquare className="h-5 w-5 text-[#829ee3]" /><h2 className="font-semibold text-white">Argument chat</h2></div>
      <ScrollArea className="h-64 px-5 py-4">
        {messages.length ? <div className="space-y-3">{messages.map((message) => (
          <div key={message.id} className={`max-w-[88%] rounded-lg border px-4 py-3 ${message.role === role ? "ml-auto border-[#425a8f] bg-[#172035]" : "border-[#303744] bg-[#171c24]"}`}>
            <div className="mb-1 flex items-center gap-2 text-xs"><span className="font-semibold text-slate-300">{message.sender.username}</span><span className="uppercase text-slate-500">{message.role}</span></div>
            <p className="whitespace-pre-wrap text-sm leading-6 text-slate-200">{message.content}</p>
          </div>
        ))}</div> : <div className="flex h-48 items-center justify-center text-sm text-slate-500">No chat arguments yet.</div>}
      </ScrollArea>
      <div className="flex gap-2 border-t border-white/10 p-4">
        <Input value={value} maxLength={2000} onChange={(event) => onChange(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); onSend(); } }} disabled={status !== "in-progress" || sending} placeholder={status === "in-progress" ? "Add a written argument…" : "Chat opens when the debate starts"} className="h-11 bg-white/5 text-white" />
        <NeonButton onClick={onSend} disabled={status !== "in-progress" || sending || !value.trim()}>{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</NeonButton>
      </div>
    </GlowCard>
  );
}

function ResultsPanel({ feedback, status, retrying, canRetry, onRetry }: { feedback: DebateFeedback | null; status: string; retrying: boolean; canRetry: boolean; onRetry: () => void }) {
  if (status === "analyzing" || (!feedback && status !== "failed")) return (
    <GlowCard glowColor="rgba(139,92,246,.28)" className="text-center">
      <Loader2 className="mx-auto mb-4 h-9 w-9 animate-spin text-[#829ee3]" /><h2 className="text-2xl font-semibold text-white">Judging the debate</h2><p className="mt-2 text-slate-400">Validating the transcript, scoring both sides, and updating the leaderboard…</p>
    </GlowCard>
  );
  if (!feedback || feedback.status === "failed") return (
    <GlowCard className="text-center"><Brain className="mx-auto mb-3 h-8 w-8 text-rose-300" /><h2 className="text-xl font-semibold text-white">Analysis needs another try</h2><p className="mt-2 text-sm text-slate-400">{feedback?.message || "The judgement could not be completed."}</p>{canRetry ? <div className="mt-5"><NeonButton onClick={onRetry} disabled={retrying}>{retrying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Retry analysis</NeonButton></div> : <p className="mt-4 text-xs text-slate-500">A debate participant can retry the judgement.</p>}</GlowCard>
  );
  if (feedback.status === "insufficient") return (
    <GlowCard className="text-center"><ShieldCheck className="mx-auto mb-3 h-8 w-8 text-amber-300" /><h2 className="text-xl font-semibold text-white">No winner selected</h2><p className="mx-auto mt-2 max-w-xl text-sm text-slate-400">{feedback.summary}</p></GlowCard>
  );
  const winnerLabel = feedback.winner === "tie" ? "The debate is a tie" : `${feedback.winner === "pro" ? "Pro" : "Con"} wins`;
  return (
    <GlowCard glowColor="rgba(245,158,11,.28)" className="overflow-hidden">
      <div className="mb-7 text-center"><Crown className="mx-auto mb-3 h-10 w-10 text-amber-300" /><p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-300">AI judgement</p><h2 className="mt-2 text-3xl font-bold text-white">{winnerLabel}</h2><p className="mx-auto mt-3 max-w-3xl text-sm leading-6 text-slate-300">{feedback.summary}</p></div>
      <div className="grid gap-4 lg:grid-cols-2"><ResultSide side="pro" result={feedback.pro} winner={feedback.winner === "pro"} /><ResultSide side="con" result={feedback.con} winner={feedback.winner === "con"} /></div>
    </GlowCard>
  );
}

function ResultSide({ side, result, winner }: { side: "pro" | "con"; result?: ParticipantResult; winner: boolean }) {
  const metrics = [["Logic", result?.logic], ["Clarity", result?.clarity], ["Persuasion", result?.persuasiveness], ["Tone", result?.tone]] as const;
  return (
    <div className={`rounded-lg border p-5 ${winner ? "border-amber-400/30 bg-amber-500/[0.07]" : "border-[#303744] bg-[#0f1319]"}`}>
      <div className="mb-5 flex items-center justify-between"><div className="flex items-center gap-2"><Target className={`h-5 w-5 ${side === "pro" ? "text-emerald-300" : "text-rose-300"}`} /><h3 className="text-xl font-semibold uppercase text-white">{side}</h3></div><div className="flex items-center gap-2"><span className="text-3xl font-bold text-white">{result?.score?.toFixed(1) ?? "—"}</span><span className="text-xs text-slate-500">/ 10</span></div></div>
      <div className="mb-5 grid grid-cols-2 gap-2">{metrics.map(([label, value]) => <div key={label} className="rounded-xl bg-black/20 p-3"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 font-semibold text-slate-200">{value?.toFixed(1) ?? "—"}</p></div>)}</div>
      <p className="text-sm leading-6 text-slate-300">{result?.feedback}</p>
      {!!result?.improvements?.length && <div className="mt-4"><p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#829ee3]">Next steps</p><ul className="space-y-1.5 text-sm text-slate-400">{result.improvements.map((item) => <li key={item} className="flex gap-2"><span className="text-[#829ee3]">•</span>{item}</li>)}</ul></div>}
    </div>
  );
}

function LoadingState() { return <div className="flex min-h-screen items-center justify-center bg-[#0b0e13]"><Loader2 className="h-8 w-8 animate-spin text-[#829ee3]" /></div>; }
function NotFoundState({ onBack }: { onBack: () => void }) { return <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4"><GlowCard className="max-w-md text-center"><Trophy className="mx-auto mb-4 h-10 w-10 text-slate-500" /><h1 className="text-2xl font-semibold text-white">Arena unavailable</h1><p className="mt-2 text-slate-400">It may be private, deleted, or the link is incorrect.</p><div className="mt-5"><NeonButton onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4" />Back to arenas</NeonButton></div></GlowCard></div>; }
