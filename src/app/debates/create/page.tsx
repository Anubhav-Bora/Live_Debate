"use client"

import type React from "react"
import { useState } from "react"
import { useAuth } from "@/context/AuthContext"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
  Copy,
  Globe2,
  Lightbulb,
  Loader2,
  LockKeyhole,
  Mic2,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react"
import { toast } from "sonner"
import { AnimatedBackground } from "@/components/ui/animated-background"
import { cn } from "@/lib/utils"

interface CreatedDebate {
  id: string
  joinCodeCon: string
  topic: string
  duration: number
  isPublic: boolean
}

export default function CreateDebatePage() {
  const { user, isLoaded } = useAuth()
  const router = useRouter()
  const [topic, setTopic] = useState("")
  const [minutes, setMinutes] = useState(5)
  const [seconds, setSeconds] = useState(0)
  const [isPublic, setIsPublic] = useState(true)
  const [creating, setCreating] = useState(false)
  const [generatingTopic, setGeneratingTopic] = useState(false)
  const [createdDebate, setCreatedDebate] = useState<CreatedDebate | null>(null)

  const duration = minutes * 60 + seconds
  const valid = topic.trim().length >= 5 && topic.trim().length <= 240 && duration >= 60 && duration <= 7_200

  const createDebate = async (event?: React.FormEvent) => {
    event?.preventDefault()
    if (!valid || creating) return
    setCreating(true)
    try {
      const response = await fetch("/api/debates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim(), duration, isPublic }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Could not create the arena")
      setCreatedDebate(data)
      toast.success("Your arena is ready.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create the arena")
    } finally {
      setCreating(false)
    }
  }

  const suggestTopic = async () => {
    setGeneratingTopic(true)
    try {
      const response = await fetch("/api/generate-topic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: "general" }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Could not generate a topic")
      setTopic(data.topic)
      toast.success("A balanced motion is ready to edit.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not generate a topic")
    } finally {
      setGeneratingTopic(false)
    }
  }

  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value)
      toast.success(`${label} copied.`)
    } catch {
      toast.error("Clipboard access was unavailable.")
    }
  }

  if (!isLoaded) return <FullScreenLoader />
  if (!user) return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <AnimatedBackground />
      <div className="surface-card relative z-10 max-w-md p-8 text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-lg border border-[#303744] bg-[#171c24]"><LockKeyhole className="h-5 w-5 text-[#829ee3]" /></span>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight text-white">Sign in to host an arena</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">Your account securely owns the room, private invitation code, transcript, and final result.</p>
        <button onClick={() => router.push("/sign-in")} className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-slate-950">Continue to sign in <ArrowRight className="h-4 w-4" /></button>
      </div>
    </div>
  )

  if (createdDebate) return <SuccessState debate={createdDebate} onCopy={copy} />

  return (
    <div className="relative min-h-screen overflow-hidden">
      <AnimatedBackground />
      <div className="relative z-10 mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
        <Link href="/debates" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-white"><ArrowLeft className="h-4 w-4" /> Back to arenas</Link>

        <motion.header initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mt-8 max-w-3xl">
          <p className="section-kicker">Host a live debate</p>
          <h1 className="font-editorial mt-4 text-balance text-4xl tracking-[-0.035em] text-[#f4f3ef] sm:text-5xl">Set the motion. Invite the opposition.</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-500">Create a focused room with a clear time limit. You’ll enter as Pro and receive a private code for the Con speaker.</p>
        </motion.header>

        <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
          <form onSubmit={createDebate} className="surface-card p-5 sm:p-7">
            <div className="flex items-center justify-between border-b border-white/[0.07] pb-5">
              <div><h2 className="text-lg font-semibold text-white">Arena details</h2><p className="mt-1 text-xs text-slate-600">Everything can be reviewed before the debate starts.</p></div>
              <span className="rounded-md border border-[#425a8f] bg-[#172035] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#a9bceb]">You are Pro</span>
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="topic" className="text-sm font-semibold text-slate-200">Debate motion</label>
                <button type="button" onClick={suggestTopic} disabled={generatingTopic} className="inline-flex items-center gap-1.5 rounded-lg border border-[#3a4351] bg-[#181d25] px-2.5 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-[#4a5568] hover:bg-[#1d232d] disabled:opacity-50">
                  {generatingTopic ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}{generatingTopic ? "Thinking..." : "Suggest with AI"}
                </button>
              </div>
              <textarea id="topic" value={topic} onChange={(event) => setTopic(event.target.value)} maxLength={240} required placeholder="e.g. Cities should make public transport free for all residents." className="mt-3 min-h-36 w-full resize-none rounded-lg border border-[#303744] bg-[#0d1117] p-4 text-base leading-7 text-white outline-none transition placeholder:text-slate-700 focus:border-[#5d86ed] focus:ring-2 focus:ring-[#5d86ed]/15" />
              <div className="mt-2 flex justify-between text-xs"><span className={topic.trim().length > 0 && topic.trim().length < 5 ? "text-amber-300" : "text-slate-600"}>Use a specific, balanced statement.</span><span className="font-mono text-slate-700">{topic.length}/240</span></div>
            </div>

            <div className="mt-7 grid gap-6 border-t border-white/[0.07] pt-6 sm:grid-cols-2">
              <fieldset>
                <legend className="flex items-center gap-2 text-sm font-semibold text-slate-200"><Clock3 className="h-4 w-4 text-[#829ee3]" /> Time limit</legend>
                <div className="mt-3 flex items-end gap-2">
                  <NumberField id="minutes" label="Minutes" value={minutes} min={0} max={120} onChange={setMinutes} />
                  <span className="pb-3 text-slate-700">:</span>
                  <NumberField id="seconds" label="Seconds" value={seconds} min={0} max={59} onChange={setSeconds} />
                </div>
                <p className={cn("mt-2 text-xs", duration < 60 || duration > 7_200 ? "text-amber-300" : "text-slate-600")}>{duration >= 60 && duration <= 7_200 ? `${Math.floor(duration / 60)}m ${duration % 60}s debate` : "Choose between 1 minute and 2 hours."}</p>
              </fieldset>

              <fieldset>
                <legend className="text-sm font-semibold text-slate-200">Room visibility</legend>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <VisibilityOption active={isPublic} onClick={() => setIsPublic(true)} icon={Globe2} title="Public" detail="Discoverable" />
                  <VisibilityOption active={!isPublic} onClick={() => setIsPublic(false)} icon={LockKeyhole} title="Private" detail="Invite only" />
                </div>
              </fieldset>
            </div>

            <div className="mt-7 flex flex-col-reverse gap-3 border-t border-white/[0.07] pt-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-center gap-2 text-xs text-slate-600"><ShieldCheck className="h-4 w-4 text-emerald-400" /> Invitation codes stay private.</p>
              <button type="submit" disabled={!valid || creating} className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-[#5d86ed] bg-[#4f73d9] px-6 text-sm font-semibold text-white transition hover:bg-[#5a7ee0] disabled:cursor-not-allowed disabled:opacity-45">
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{creating ? "Creating arena..." : "Create arena"}{!creating ? <ArrowRight className="h-4 w-4" /> : null}
              </button>
            </div>
          </form>

          <aside className="space-y-4 lg:sticky lg:top-24">
            <div className="surface-card p-5">
              <Lightbulb className="h-5 w-5 text-amber-300" />
              <h2 className="mt-4 text-base font-semibold text-white">A strong motion</h2>
              <ul className="mt-3 space-y-3 text-sm leading-6 text-slate-500">
                {["Makes one clear claim", "Gives both sides a fair case", "Can be debated within the time limit"].map((item) => <li key={item} className="flex gap-2"><Check className="mt-1 h-3.5 w-3.5 shrink-0 text-[#829ee3]" />{item}</li>)}
              </ul>
            </div>
            <div className="surface-card p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">What happens next</p>
              <div className="mt-4 space-y-4">
                <AsideStep icon={Users} title="Invite Con" detail="Share the private 8-character code." />
                <AsideStep icon={Mic2} title="Check media" detail="Both speakers start camera and microphone." />
                <AsideStep icon={Sparkles} title="Receive judgement" detail="Scores and winner update automatically." />
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}

function NumberField({ id, label, value, min, max, onChange }: { id: string; label: string; value: number; min: number; max: number; onChange: (value: number) => void }) {
  return <label htmlFor={id} className="min-w-0 flex-1"><span className="text-[10px] uppercase tracking-wider text-slate-600">{label}</span><input id={id} type="number" value={value} min={min} max={max} onChange={(event) => onChange(Math.max(min, Math.min(max, Number(event.target.value) || 0)))} className="mt-1.5 h-11 w-full rounded-lg border border-[#303744] bg-[#0d1117] px-3 font-mono text-sm text-white outline-none focus:border-[#5d86ed]" /></label>
}

function VisibilityOption({ active, onClick, icon: Icon, title, detail }: { active: boolean; onClick: () => void; icon: typeof Globe2; title: string; detail: string }) {
  return <button type="button" onClick={onClick} className={cn("rounded-lg border p-3 text-left transition", active ? "border-[#425a8f] bg-[#172035]" : "border-[#303744] bg-[#0f1319] hover:bg-[#171c24]")}><Icon className={cn("h-4 w-4", active ? "text-[#829ee3]" : "text-slate-600")} /><span className="mt-3 block text-xs font-semibold text-slate-200">{title}</span><span className="mt-0.5 block text-[10px] text-slate-600">{detail}</span></button>
}

function AsideStep({ icon: Icon, title, detail }: { icon: typeof Users; title: string; detail: string }) {
  return <div className="flex gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-[#303744] bg-[#171c24]"><Icon className="h-4 w-4 text-[#829ee3]" /></span><div><p className="text-xs font-semibold text-slate-200">{title}</p><p className="mt-1 text-xs leading-5 text-slate-600">{detail}</p></div></div>
}

function SuccessState({ debate, onCopy }: { debate: CreatedDebate; onCopy: (value: string, label: string) => void }) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <AnimatedBackground />
      <div className="relative z-10 mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <motion.div initial={{ opacity: 0, y: 18, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="surface-card overflow-hidden p-6 sm:p-9">
          <span className="grid h-12 w-12 place-items-center rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.08]"><CheckCircle2 className="h-5 w-5 text-emerald-300" /></span>
          <p className="section-kicker mt-6">Arena created</p>
          <h1 className="mt-3 text-balance text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">Your debate room is ready.</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-500">Share the room ID with spectators and the private Con code only with your intended opponent.</p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <CopyField label="Room ID" value={debate.id} onCopy={() => onCopy(debate.id, "Room ID")} />
            <CopyField label="Private Con code" value={debate.joinCodeCon} onCopy={() => onCopy(debate.joinCodeCon, "Con code")} emphasized />
          </div>

          <div className="mt-6 rounded-lg border border-[#303744] bg-[#0f1319] p-4"><p className="text-xs font-semibold text-slate-300">Motion</p><p className="mt-2 text-sm leading-6 text-slate-500">{debate.topic}</p></div>

          <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link href="/debates" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 px-4 text-sm font-semibold text-slate-300 hover:bg-white/[0.05]"><ArrowLeft className="h-4 w-4" /> All arenas</Link>
            <Link href={`/debates/${debate.id}`} className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-[#5d86ed] bg-[#4f73d9] px-6 text-sm font-semibold text-white transition hover:bg-[#5a7ee0]">Enter your arena <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

function CopyField({ label, value, onCopy, emphasized = false }: { label: string; value: string; onCopy: () => void; emphasized?: boolean }) {
  return <div className={cn("rounded-lg border p-4", emphasized ? "border-[#425a8f] bg-[#172035]" : "border-[#303744] bg-[#0f1319]")}><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-600">{label}</p><div className="mt-3 flex items-center gap-3"><code className="min-w-0 flex-1 truncate text-sm font-bold tracking-wider text-white">{value}</code><button type="button" onClick={onCopy} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-[#303744] bg-[#171c24] text-slate-400 transition hover:text-[#a9bceb]" aria-label={`Copy ${label}`}><Copy className="h-4 w-4" /></button></div></div>
}

function FullScreenLoader() {
  return <div className="relative flex min-h-screen items-center justify-center overflow-hidden"><AnimatedBackground /><Loader2 className="relative z-10 h-7 w-7 animate-spin text-[#829ee3]" aria-label="Loading account" /></div>
}
