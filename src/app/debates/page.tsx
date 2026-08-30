"use client"

import type React from "react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useAuth } from "@/context/AuthContext"
import { motion } from "framer-motion"
import Link from "next/link"
import {
  ArrowRight,
  CalendarDays,
  Clock3,
  Eye,
  LockKeyhole,
  MessageSquare,
  Plus,
  Radio,
  Search,
  Sparkles,
  Trash2,
  Trophy,
  Users,
} from "lucide-react"
import { toast } from "sonner"
import { AnimatedBackground } from "@/components/ui/animated-background"
import { useSocket } from "@/context/SocketContext"
import { cn } from "@/lib/utils"

interface Debate {
  id: string
  topic: string
  status: "waiting" | "in-progress" | "completed"
  analysisStatus: string
  winner?: "pro" | "con" | "tie" | null
  isPublic: boolean
  duration: number
  createdAt: string
  proUser: { username: string } | null
  conUser: { username: string } | null
  canDelete: boolean
  _count: { messages: number }
}

type FilterType = "all" | Debate["status"]

const filters: Array<{ value: FilterType; label: string }> = [
  { value: "all", label: "All arenas" },
  { value: "waiting", label: "Open" },
  { value: "in-progress", label: "Live" },
  { value: "completed", label: "Results" },
]

export default function DebatesPage() {
  const { isSignedIn, isLoaded } = useAuth()
  const { socket } = useSocket()
  const [debates, setDebates] = useState<Debate[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filter, setFilter] = useState<FilterType>("all")

  const fetchDebates = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true)
      const response = await fetch("/api/debates", { cache: "no-store" })
      if (!response.ok) throw new Error("Could not load debates")
      const data = await response.json()
      setDebates(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("Error fetching debates:", error)
      toast.error("The arenas could not be refreshed.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isLoaded) fetchDebates()
  }, [fetchDebates, isLoaded, isSignedIn])

  useEffect(() => {
    if (!socket) return
    const refresh = () => fetchDebates(false)
    socket.on("dashboard_updated", refresh)
    return () => { socket.off("dashboard_updated", refresh) }
  }, [fetchDebates, socket])

  useEffect(() => {
    const interval = setInterval(() => fetchDebates(false), 30_000)
    return () => clearInterval(interval)
  }, [fetchDebates])

  const visibleDebates = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    return debates.filter((debate) =>
      (filter === "all" || debate.status === filter) &&
      (!query || debate.topic.toLowerCase().includes(query) || debate.proUser?.username.toLowerCase().includes(query) || debate.conUser?.username.toLowerCase().includes(query)),
    )
  }, [debates, filter, searchTerm])

  const liveCount = debates.filter((debate) => debate.status === "in-progress").length
  const openCount = debates.filter((debate) => debate.status === "waiting").length

  const deleteDebate = async (debateId: string, event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    if (!isSignedIn || !confirm("Delete this arena and its saved debate data?")) return
    try {
      const response = await fetch(`/api/debates/${debateId}`, { method: "DELETE" })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Could not delete debate")
      setDebates((current) => current.filter((debate) => debate.id !== debateId))
      toast.success("Arena deleted.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete debate")
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <AnimatedBackground />
      <div className="relative z-10 mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
        <motion.header initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="section-kicker">Public debate network</p>
            <h1 className="font-editorial mt-4 text-balance text-4xl tracking-[-0.035em] text-[#f4f3ef] sm:text-5xl">Find your next argument.</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-500">Watch a live exchange, review a completed judgement, or claim an open Con position with an invitation code.</p>
          </div>
          {isSignedIn && (
            <Link href="/debates/create" className="inline-flex h-12 items-center justify-center gap-2 self-start rounded-lg border border-[#5d86ed] bg-[#4f73d9] px-5 text-sm font-semibold text-white transition hover:bg-[#5a7ee0] lg:self-auto">
              <Plus className="h-4 w-4" /> Create arena
            </Link>
          )}
        </motion.header>

        <div className="mt-10 grid gap-3 sm:grid-cols-3">
          <Stat icon={Radio} label="Live now" value={liveCount} accent="text-rose-300" />
          <Stat icon={Users} label="Open positions" value={openCount} accent="text-[#829ee3]" />
          <Stat icon={Trophy} label="Debates indexed" value={debates.length} accent="text-amber-300" />
        </div>

        <div className="mt-8 flex flex-col gap-3 rounded-xl border border-[#282e38] bg-[#12161d] p-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative min-w-0 flex-1 lg:max-w-md">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
            <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search motions or speakers" className="h-11 w-full rounded-lg border border-[#303744] bg-[#0d1117] pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-[#5d86ed] focus:ring-2 focus:ring-[#5d86ed]/15" />
          </div>
          <div className="flex gap-1 overflow-x-auto rounded-xl bg-black/20 p-1">
            {filters.map((item) => (
              <button key={item.value} type="button" onClick={() => setFilter(item.value)} className={cn("shrink-0 rounded-lg px-3.5 py-2 text-xs font-semibold transition", filter === item.value ? "bg-white/[0.1] text-white shadow-sm" : "text-slate-500 hover:text-slate-200")}>{item.label}</button>
            ))}
          </div>
        </div>

        <div className="mt-8">
          {loading ? <LoadingGrid /> : visibleDebates.length === 0 ? (
            <div className="surface-card flex min-h-80 flex-col items-center justify-center px-6 text-center">
              <span className="grid h-14 w-14 place-items-center rounded-lg border border-[#303744] bg-[#171c24]"><Sparkles className="h-6 w-6 text-[#829ee3]" /></span>
              <h2 className="mt-5 text-xl font-semibold text-white">No matching arenas</h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">Try a different filter or create the first arena for a new motion.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {visibleDebates.map((debate, index) => <DebateCard key={debate.id} debate={debate} index={index} onDelete={deleteDebate} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Stat({ icon: Icon, label, value, accent }: { icon: typeof Radio; label: string; value: number; accent: string }) {
  return (
    <div className="surface-card flex items-center gap-4 px-5 py-4">
      <span className="grid h-10 w-10 place-items-center rounded-xl border border-white/[0.07] bg-white/[0.035]"><Icon className={cn("h-4 w-4", accent)} /></span>
      <div><p className="text-xl font-bold tracking-tight text-white">{value}</p><p className="text-xs text-slate-500">{label}</p></div>
    </div>
  )
}

function DebateCard({ debate, index, onDelete }: { debate: Debate; index: number; onDelete: (id: string, event: React.MouseEvent) => void }) {
  const status = debate.status === "in-progress"
    ? { label: "Live", icon: Radio, style: "border-rose-300/20 bg-rose-400/[0.08] text-rose-200" }
    : debate.status === "completed"
      ? { label: debate.analysisStatus === "analyzing" ? "Judging" : "Result", icon: Trophy, style: "border-amber-300/20 bg-amber-400/[0.07] text-amber-200" }
      : { label: "Open", icon: Clock3, style: "border-[#5874ad] bg-[#1a2945] text-[#a9bceb]" }
  const StatusIcon = status.icon

  return (
    <motion.article initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: Math.min(index * 0.045, 0.3) }} whileHover={{ y: -3 }} className="group relative">
      <Link href={`/debates/${debate.id}`} className="surface-card flex h-full min-h-72 flex-col p-5 transition-colors hover:border-white/[0.14]">
        <div className="flex items-center justify-between gap-3">
          <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em]", status.style)}><StatusIcon className={cn("h-3 w-3", debate.status === "in-progress" && "animate-pulse")} />{status.label}</span>
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-600">{debate.isPublic ? <Eye className="h-3 w-3" /> : <LockKeyhole className="h-3 w-3" />}{debate.isPublic ? "Public" : "Private"}</span>
        </div>

        <h2 className="mt-5 line-clamp-3 text-xl font-semibold leading-7 tracking-[-0.025em] text-slate-100 transition group-hover:text-white">{debate.topic}</h2>

        <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <Participant label="Pro" name={debate.proUser?.username || "Open"} tone="blue" />
          <span className="text-[9px] font-bold text-slate-700">VS</span>
          <Participant label="Con" name={debate.conUser?.username || "Open"} tone="neutral" />
        </div>

        <div className="mt-auto flex items-center justify-between border-t border-white/[0.06] pt-4 text-[11px] text-slate-600">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />{new Date(debate.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
            <span className="inline-flex items-center gap-1.5"><MessageSquare className="h-3.5 w-3.5" />{debate._count.messages}</span>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-500 transition-transform group-hover:translate-x-0.5 group-hover:text-[#8aa7ed]" />
        </div>
      </Link>
      {debate.canDelete && debate.status !== "in-progress" && (
        <button type="button" onClick={(event) => onDelete(debate.id, event)} className="absolute right-4 top-4 grid h-8 w-8 translate-y-9 place-items-center rounded-lg border border-rose-300/15 bg-[#111724] text-rose-300 opacity-100 transition hover:bg-rose-400/10 md:translate-y-10 md:opacity-0 md:group-hover:translate-y-9 md:group-hover:opacity-100 md:focus:translate-y-9 md:focus:opacity-100" aria-label="Delete arena"><Trash2 className="h-3.5 w-3.5" /></button>
      )}
    </motion.article>
  )
}

function Participant({ label, name, tone }: { label: string; name: string; tone: "blue" | "neutral" }) {
  return (
    <div className="min-w-0 rounded-xl border border-white/[0.06] bg-black/15 p-3">
      <p className={cn("text-[9px] font-bold uppercase tracking-[0.14em]", tone === "blue" ? "text-[#829ee3]" : "text-slate-500")}>{label}</p>
      <p className="mt-1.5 truncate text-xs font-semibold text-slate-300">{name}</p>
    </div>
  )
}

function LoadingGrid() {
  return <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, index) => <div key={index} className="surface-card h-72 animate-pulse bg-white/[0.025]" />)}</div>
}
