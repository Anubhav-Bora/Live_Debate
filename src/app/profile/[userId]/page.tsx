"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Award, CalendarDays, ChartNoAxesColumnIncreasing, MessageSquareText, Scale, Target, Trophy, UserRound } from "lucide-react";
import { AnimatedBackground } from "@/components/ui/animated-background";

interface UserProfile {
  id: string;
  username: string;
  createdAt: string;
  scores: Array<{
    logic: number;
    clarity: number;
    persuasiveness: number;
    tone: number;
    createdAt: string;
    debate: { topic: string; id: string; winner?: string | null };
  }>;
  badges: Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
    earnedAt: string;
  }>;
  totalScore: number;
  debateCount: number;
}

export default function ProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch(`/api/users/${userId}`, { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json() as UserProfile;
        if (!cancelled) setProfile(data);
      } catch (error) {
        console.error("Could not load profile:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [userId]);

  const averages = useMemo(() => {
    if (!profile?.scores.length) return [];
    const keys = ["logic", "clarity", "persuasiveness", "tone"] as const;
    return keys.map((key) => ({
      key,
      label: key === "persuasiveness" ? "Persuasion" : key.charAt(0).toUpperCase() + key.slice(1),
      value: profile.scores.reduce((sum, score) => sum + score[key], 0) / profile.scores.length,
    }));
  }, [profile]);

  if (loading) return <ProfileSkeleton />;
  if (!profile) return <MissingProfile />;

  return (
    <div className="relative min-h-screen overflow-hidden">
      <AnimatedBackground />
      <div className="relative z-10 mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <Link href="/leaderboard" className="inline-flex items-center gap-2 text-sm text-slate-500 transition hover:text-white"><ArrowLeft className="h-4 w-4" />Back to rankings</Link>

        <header className="mt-7 flex flex-col gap-6 border-b border-[#282e38] pb-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-5">
            <span className="grid h-16 w-16 shrink-0 place-items-center rounded-lg border border-[#3a465d] bg-[#172035] text-2xl font-semibold uppercase text-[#b5c6f2]">{profile.username.charAt(0)}</span>
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-editorial text-4xl tracking-[-0.035em] text-[#f4f3ef]">{profile.username}</h1>
                <span className="rounded-md border border-[#303744] bg-[#171c24] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">{profile.debateCount ? "Ranked" : "New member"}</span>
              </div>
              <p className="mt-2 flex items-center gap-2 text-sm text-slate-500"><CalendarDays className="h-4 w-4" />Member since {new Date(profile.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</p>
            </div>
          </div>
          <Link href="/debates" className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-lg border border-[#303744] bg-[#171c24] px-4 text-sm font-semibold text-slate-200 transition hover:border-[#465064] hover:bg-[#1d232d] sm:self-auto">View debates <ArrowUpRight className="h-4 w-4" /></Link>
        </header>

        <section className="mt-8 grid gap-3 sm:grid-cols-3">
          <Stat icon={Trophy} label="Average score" value={profile.debateCount ? profile.totalScore.toFixed(1) : "—"} suffix={profile.debateCount ? "/ 10" : undefined} />
          <Stat icon={MessageSquareText} label="Judged debates" value={profile.debateCount.toString()} />
          <Stat icon={Award} label="Achievements" value={profile.badges.length.toString()} />
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[.9fr_1.1fr]">
          <section className="surface-card p-6">
            <div className="flex items-center gap-3 border-b border-[#282e38] pb-5">
              <ChartNoAxesColumnIncreasing className="h-5 w-5 text-[#829ee3]" />
              <div><h2 className="font-semibold text-white">Category performance</h2><p className="mt-1 text-xs text-slate-600">Average across judged debates</p></div>
            </div>
            {averages.length ? (
              <div className="mt-6 space-y-6">
                {averages.map((metric) => (
                  <div key={metric.key}>
                    <div className="mb-2 flex items-center justify-between text-sm"><span className="text-slate-400">{metric.label}</span><span className="font-semibold text-slate-200">{metric.value.toFixed(1)}</span></div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[#242a33]"><div className="h-full rounded-full bg-[#6385d8]" style={{ width: `${Math.max(0, Math.min(100, metric.value * 10))}%` }} /></div>
                  </div>
                ))}
              </div>
            ) : <EmptyBlock icon={Target} title="No score history" copy="Complete a debate to build a category performance record." />}
          </section>

          <section className="surface-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#282e38] px-6 py-5">
              <div><h2 className="font-semibold text-white">Recent debates</h2><p className="mt-1 text-xs text-slate-600">Latest judged results</p></div>
              <Scale className="h-5 w-5 text-slate-600" />
            </div>
            {profile.scores.length ? (
              <div className="divide-y divide-[#242a33]">
                {profile.scores.map((score) => {
                  const average = (score.logic + score.clarity + score.persuasiveness + score.tone) / 4;
                  return (
                    <Link key={score.debate.id} href={`/debates/${score.debate.id}`} className="grid grid-cols-[1fr_auto] gap-5 px-6 py-5 transition hover:bg-white/[0.025]">
                      <div className="min-w-0"><p className="truncate text-sm font-medium text-slate-200">{score.debate.topic}</p><p className="mt-1.5 text-xs text-slate-600">{new Date(score.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p></div>
                      <div className="text-right"><p className="text-lg font-semibold text-white">{average.toFixed(1)}</p><p className="text-[10px] text-slate-600">overall</p></div>
                    </Link>
                  );
                })}
              </div>
            ) : <div className="p-6"><EmptyBlock icon={MessageSquareText} title="No completed debates" copy="Completed sessions will appear here with their result." /></div>}
          </section>
        </div>

        <section className="surface-card mt-6 p-6">
          <div className="flex items-center gap-3"><Award className="h-5 w-5 text-[#829ee3]" /><div><h2 className="font-semibold text-white">Achievements</h2><p className="mt-1 text-xs text-slate-600">Milestones earned through debate activity</p></div></div>
          {profile.badges.length ? (
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {profile.badges.map((badge) => (
                <div key={badge.id} className="rounded-lg border border-[#303744] bg-[#0f1319] p-4"><div className="flex items-start gap-3"><span className="text-xl" aria-hidden="true">{badge.icon}</span><div><p className="text-sm font-semibold text-slate-200">{badge.name}</p><p className="mt-1 text-xs leading-5 text-slate-600">{badge.description}</p></div></div></div>
              ))}
            </div>
          ) : <EmptyBlock icon={Award} title="No achievements yet" copy="Milestones appear here as the debate record grows." />}
        </section>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, suffix }: { icon: typeof Trophy; label: string; value: string; suffix?: string }) {
  return <div className="surface-card flex items-center gap-4 px-5 py-4"><span className="grid h-10 w-10 place-items-center rounded-lg border border-[#303744] bg-[#171c24]"><Icon className="h-4 w-4 text-[#829ee3]" /></span><div><p className="text-xl font-semibold text-white">{value}<span className="ml-1 text-xs font-normal text-slate-600">{suffix}</span></p><p className="text-xs text-slate-500">{label}</p></div></div>;
}

function EmptyBlock({ icon: Icon, title, copy }: { icon: typeof Target; title: string; copy: string }) {
  return <div className="flex min-h-40 flex-col items-center justify-center px-5 text-center"><Icon className="h-6 w-6 text-slate-700" /><p className="mt-3 text-sm font-medium text-slate-300">{title}</p><p className="mt-1 max-w-xs text-xs leading-5 text-slate-600">{copy}</p></div>;
}

function ProfileSkeleton() {
  return <div className="relative min-h-screen"><AnimatedBackground /><div className="relative z-10 mx-auto max-w-6xl animate-pulse px-4 py-14 sm:px-6"><div className="h-4 w-32 rounded bg-[#202630]" /><div className="mt-8 h-20 rounded-lg bg-[#151a21]" /><div className="mt-8 grid gap-3 sm:grid-cols-3">{Array.from({ length: 3 }, (_, index) => <div key={index} className="h-20 rounded-xl bg-[#151a21]" />)}</div><div className="mt-6 grid gap-6 lg:grid-cols-2"><div className="h-96 rounded-xl bg-[#151a21]" /><div className="h-96 rounded-xl bg-[#151a21]" /></div></div></div>;
}

function MissingProfile() {
  return <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center px-4"><AnimatedBackground /><div className="surface-card relative z-10 max-w-md p-8 text-center"><UserRound className="mx-auto h-8 w-8 text-slate-600" /><h1 className="font-editorial mt-5 text-3xl text-[#f4f3ef]">Profile unavailable</h1><p className="mt-3 text-sm leading-6 text-slate-500">This account may have been removed or the link is incorrect.</p><Link href="/leaderboard" className="mt-6 inline-flex h-10 items-center gap-2 rounded-lg border border-[#303744] bg-[#171c24] px-4 text-sm font-semibold text-slate-200"><ArrowLeft className="h-4 w-4" />Back to rankings</Link></div></div>;
}
