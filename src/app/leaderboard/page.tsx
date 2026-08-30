"use client"

import { useCallback, useEffect, useState } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { ArrowUpRight, Award, Crown, Medal, RefreshCw, Sparkles, Target, Trophy, Users } from "lucide-react"
import { AnimatedBackground } from "@/components/ui/animated-background"
import { useSocket } from "@/context/SocketContext"
import { cn } from "@/lib/utils"

interface UserScore {
  id: string
  username: string
  totalScore: number
  debateCount: number
  badges: number
}

type TimeRange = "week" | "month" | "all"

const ranges: Array<{ value: TimeRange; label: string }> = [
  { value: "week", label: "7 days" },
  { value: "month", label: "30 days" },
  { value: "all", label: "All time" },
]

export default function LeaderboardPage() {
  const { socket } = useSocket()
  const [users, setUsers] = useState<UserScore[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [timeRange, setTimeRange] = useState<TimeRange>("week")
  const [error, setError] = useState("")

  const fetchLeaderboard = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true)
      else setRefreshing(true)
      setError("")
      const response = await fetch(`/api/leaderboard?range=${timeRange}`, { cache: "no-store" })
      if (!response.ok) throw new Error("Could not load leaderboard")
      const data = await response.json()
      setUsers(Array.isArray(data.leaderboard) ? data.leaderboard : [])
    } catch (fetchError) {
      console.error("Error fetching leaderboard:", fetchError)
      setError("Rankings could not be refreshed. Existing results are still shown.")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [timeRange])

  useEffect(() => { fetchLeaderboard() }, [fetchLeaderboard])

  useEffect(() => {
    if (!socket) return
    const refresh = () => fetchLeaderboard(false)
    socket.on("dashboard_updated", refresh)
    return () => { socket.off("dashboard_updated", refresh) }
  }, [fetchLeaderboard, socket])

  useEffect(() => {
    const interval = setInterval(() => fetchLeaderboard(false), 30_000)
    return () => clearInterval(interval)
  }, [fetchLeaderboard])

  const debateTotal = users.reduce((sum, user) => sum + user.debateCount, 0)
  const averageScore = users.length ? users.reduce((sum, user) => sum + user.totalScore, 0) / users.length : 0

  return (
    <div className="relative min-h-screen overflow-hidden">
      <AnimatedBackground />
      <div className="relative z-10 mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
        <motion.header initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="section-kicker">Performance index</p>
            <h1 className="font-editorial mt-4 text-balance text-4xl tracking-[-0.035em] text-[#f4f3ef] sm:text-5xl">The strongest cases rise.</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-500">Rankings use the average of logic, clarity, persuasion, and tone across judged debates.</p>
          </div>
          <div className="inline-flex w-fit items-center gap-1 rounded-xl border border-white/[0.08] bg-white/[0.035] p-1">
            {ranges.map((range) => (
              <button key={range.value} type="button" onClick={() => setTimeRange(range.value)} className={cn("rounded-lg px-4 py-2 text-xs font-semibold transition", timeRange === range.value ? "bg-white/[0.11] text-white shadow-sm" : "text-slate-500 hover:text-slate-200")}>{range.label}</button>
            ))}
          </div>
        </motion.header>

        <div className="mt-10 grid gap-3 sm:grid-cols-3">
          <Metric icon={Users} label="Ranked debaters" value={users.length.toString()} />
          <Metric icon={Target} label="Judged entries" value={debateTotal.toString()} />
          <Metric icon={Sparkles} label="Community average" value={averageScore ? averageScore.toFixed(1) : "—"} />
        </div>

        {error && <div className="mt-6 flex items-center justify-between gap-4 rounded-xl border border-rose-300/15 bg-rose-400/[0.07] px-4 py-3 text-sm text-rose-100"><span>{error}</span><button type="button" onClick={() => fetchLeaderboard(false)} className="font-semibold hover:text-white">Retry</button></div>}

        {loading ? <LeaderboardSkeleton /> : users.length === 0 ? (
          <div className="surface-card mt-8 flex min-h-80 flex-col items-center justify-center px-6 text-center">
            <Trophy className="h-8 w-8 text-amber-300" />
            <h2 className="mt-5 text-xl font-semibold text-white">The table is open</h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">Complete a judged debate to become the first ranked speaker in this period.</p>
            <Link href="/debates" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#8aa7ed] hover:text-[#a5b9ea]">Explore arenas <ArrowUpRight className="h-4 w-4" /></Link>
          </div>
        ) : (
          <>
            <section className="mt-8 grid gap-4 lg:grid-cols-3">
              {users.slice(0, 3).map((user, index) => <PodiumCard key={user.id} user={user} rank={index + 1} />)}
            </section>

            <section className="surface-card mt-6 overflow-hidden">
              <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4 sm:px-6">
                <div><p className="text-sm font-semibold text-white">Full standings</p><p className="mt-0.5 text-xs text-slate-600">Updated automatically after every judgement</p></div>
                <RefreshCw className={cn("h-4 w-4 text-slate-600", refreshing && "animate-spin text-[#829ee3]")} />
              </div>
              <div className="divide-y divide-white/[0.06]">
                {users.map((user, index) => <RankingRow key={user.id} user={user} rank={index + 1} index={index} />)}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  )
}

function Metric({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) {
  return <div className="surface-card flex items-center gap-4 px-5 py-4"><span className="grid h-10 w-10 place-items-center rounded-lg border border-[#303744] bg-[#171c24]"><Icon className="h-4 w-4 text-[#829ee3]" /></span><div><p className="text-xl font-bold tracking-tight text-white">{value}</p><p className="text-xs text-slate-500">{label}</p></div></div>
}

function PodiumCard({ user, rank }: { user: UserScore; rank: number }) {
  const config = rank === 1
    ? { title: "Current leader", Icon: Crown, color: "text-amber-300", surface: "border-amber-200/[0.14] bg-[#171815]" }
    : rank === 2
      ? { title: "Second place", Icon: Medal, color: "text-slate-300", surface: "bg-[#141820]" }
      : { title: "Third place", Icon: Award, color: "text-orange-300", surface: "bg-[#161715]" }
  return (
    <motion.article initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: rank * 0.04 }} className={cn("surface-card p-6", config.surface)}>
      <div className="flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{config.title}</span><config.Icon className={cn("h-5 w-5", config.color)} /></div>
      <div className="mt-7 flex items-center gap-4"><span className="grid h-12 w-12 place-items-center rounded-lg border border-[#303744] bg-[#202630] text-lg font-bold text-white">{user.username.charAt(0).toUpperCase()}</span><div className="min-w-0"><Link href={`/profile/${user.id}`} className="truncate text-lg font-semibold text-white hover:text-[#a5b9ea]">{user.username}</Link><p className="mt-1 text-xs text-slate-500">{user.debateCount} judged {user.debateCount === 1 ? "debate" : "debates"}</p></div></div>
      <div className="mt-7 flex items-end justify-between border-t border-white/[0.07] pt-5"><span className="text-xs text-slate-500">Average score</span><span className="text-3xl font-semibold tracking-[-0.04em] text-white">{user.totalScore.toFixed(1)}<span className="ml-1 text-xs font-normal text-slate-600">/ 10</span></span></div>
    </motion.article>
  )
}

function RankingRow({ user, rank, index }: { user: UserScore; rank: number; index: number }) {
  return (
    <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, delay: Math.min(index * 0.025, 0.3) }} className="grid grid-cols-[2.5rem_1fr_auto] items-center gap-3 px-4 py-4 transition hover:bg-white/[0.025] sm:grid-cols-[3rem_1fr_8rem_8rem_5rem] sm:px-6">
      <span className={cn("font-mono text-xs", rank <= 3 ? "font-bold text-[#829ee3]" : "text-slate-600")}>{String(rank).padStart(2, "0")}</span>
      <div className="flex min-w-0 items-center gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#202630] text-xs font-bold text-slate-300">{user.username.charAt(0).toUpperCase()}</span><Link href={`/profile/${user.id}`} className="truncate text-sm font-semibold text-slate-200 transition hover:text-[#a5b9ea]">{user.username}</Link></div>
      <div className="text-right"><span className="text-sm font-bold text-white">{user.totalScore.toFixed(1)}</span><span className="ml-1 text-[10px] text-slate-600">pts</span></div>
      <div className="hidden text-right text-xs text-slate-500 sm:block">{user.debateCount} debates</div>
      <div className="hidden items-center justify-end gap-1 text-xs text-slate-500 sm:flex"><Award className="h-3.5 w-3.5 text-[#829ee3]" />{user.badges}</div>
    </motion.div>
  )
}

function LeaderboardSkeleton() {
  return <div className="mt-8 space-y-6"><div className="grid gap-4 lg:grid-cols-3">{Array.from({ length: 3 }, (_, index) => <div key={index} className="surface-card h-56 animate-pulse bg-white/[0.025]" />)}</div><div className="surface-card h-96 animate-pulse bg-white/[0.025]" /></div>
}
