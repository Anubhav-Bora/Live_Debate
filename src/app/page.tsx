"use client";

import type React from "react";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, BarChart3, Check, Clock3, FileText, LockKeyhole, MessageSquareText, Mic2, Radio, Scale, ShieldCheck, Users, Video } from "lucide-react";
import { AnimatedBackground } from "@/components/ui/animated-background";
import { useAuth } from "@/context/AuthContext";

const workflow = [
  { number: "01", title: "Set the motion", copy: "Create a private or public room, choose the duration, and invite the opposing speaker." },
  { number: "02", title: "Make the case", copy: "Debate face to face while the application keeps time and captures each side separately." },
  { number: "03", title: "Review the result", copy: "Receive a structured decision, category scores, and concrete areas for improvement." },
];

const capabilities = [
  { icon: Video, title: "Live rooms", copy: "Peer-to-peer video with participant readiness and reliable room controls." },
  { icon: Mic2, title: "Separate transcripts", copy: "Speech is attributed to Pro and Con throughout the session." },
  { icon: Scale, title: "Consistent judging", copy: "Both arguments are measured against the same scoring framework." },
  { icon: BarChart3, title: "Performance record", copy: "Results update profiles and standings as soon as judging is complete." },
];

export default function Home() {
  const router = useRouter();
  const { user, isLoaded } = useAuth();
  const [debateId, setDebateId] = useState("");

  const joinDebate = (event: React.FormEvent) => {
    event.preventDefault();
    const id = debateId.trim();
    if (id) router.push(`/debates/${encodeURIComponent(id)}`);
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <AnimatedBackground />

      <section className="relative z-10 mx-auto grid max-w-7xl items-center gap-14 px-4 pb-20 pt-16 sm:px-6 sm:pt-24 lg:min-h-[calc(100vh-4rem)] lg:grid-cols-[1fr_.92fr] lg:py-24">
        <div>
          <div className="mb-7 flex items-center gap-3 text-sm font-medium text-slate-400">
            <span className="h-px w-8 bg-[#5d86ed]" />
            A serious space for live debate
          </div>
          <h1 className="font-editorial max-w-3xl text-balance text-5xl leading-[1.02] tracking-[-0.045em] text-[#f4f3ef] sm:text-6xl lg:text-7xl">
            Better arguments deserve a clear outcome.
          </h1>
          <p className="mt-7 max-w-xl text-pretty text-base leading-7 text-slate-400 sm:text-lg sm:leading-8">
            Host focused video debates, preserve the record, and receive structured feedback on logic, clarity, persuasion, and tone.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            {isLoaded && user ? (
              <>
                <Link href="/debates/create" className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[#4f73d9] px-6 text-sm font-semibold text-white transition hover:bg-[#5a7ee0]">
                  Create a debate <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/debates" className="inline-flex h-12 items-center justify-center rounded-lg border border-[#303744] bg-[#141820] px-6 text-sm font-semibold text-slate-200 transition hover:border-[#424b5a] hover:bg-[#181d25]">
                  View open debates
                </Link>
              </>
            ) : isLoaded ? (
              <>
                <Link href="/sign-up" className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[#4f73d9] px-6 text-sm font-semibold text-white transition hover:bg-[#5a7ee0]">
                  Create an account <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/debates" className="inline-flex h-12 items-center justify-center rounded-lg border border-[#303744] bg-[#141820] px-6 text-sm font-semibold text-slate-200 transition hover:border-[#424b5a] hover:bg-[#181d25]">
                  Browse as a spectator
                </Link>
              </>
            ) : <span className="h-12 w-52 animate-pulse rounded-lg bg-[#171c24]" />}
          </div>

          <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3 text-sm text-slate-500">
            {["No installation", "Private rooms", "Browser-based"].map((item) => (
              <span key={item} className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-[#7694df]" />{item}</span>
            ))}
          </div>
        </div>

        <div className="mx-auto w-full max-w-xl">
          <div className="overflow-hidden rounded-xl border border-[#2b323d] bg-[#11151b] shadow-[0_28px_80px_-42px_rgba(0,0,0,.95)]">
            <div className="flex items-center justify-between border-b border-[#282e38] px-5 py-4">
              <div>
                <p className="text-xs font-semibold text-slate-200">Public transport policy</p>
                <p className="mt-1 text-[11px] text-slate-600">Debate 014 · Public room</p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-md border border-rose-400/20 bg-rose-400/[0.07] px-2.5 py-1 text-[11px] font-semibold text-rose-200">
                <Radio className="h-3 w-3" /> Live
              </span>
            </div>

            <div className="p-5 sm:p-6">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">Time remaining</p>
                <span className="flex items-center gap-2 font-mono text-lg font-semibold text-white"><Clock3 className="h-4 w-4 text-slate-500" />04:18</span>
              </div>

              <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                <Speaker side="Pro" name="Maya Chen" active />
                <span className="text-[10px] font-semibold text-slate-700">VS</span>
                <Speaker side="Con" name="Arjun Mehta" />
              </div>

              <div className="mt-5 rounded-lg border border-[#252b34] bg-[#0d1117] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="flex items-center gap-2 text-xs font-medium text-slate-400"><FileText className="h-3.5 w-3.5" />Live transcript</span>
                  <span className="text-[10px] text-slate-600">Speaker: Pro</span>
                </div>
                <p className="text-sm leading-6 text-slate-300">“Free public transport reduces congestion while expanding access to work and education...”</p>
                <span className="mt-3 block h-0.5 w-24 bg-[#5d86ed]" />
              </div>

              <div className="mt-5 grid grid-cols-4 divide-x divide-[#282e38] border-t border-[#282e38] pt-5">
                {[ ["Logic", "8.7"], ["Clarity", "8.4"], ["Persuasion", "8.6"], ["Tone", "8.9"] ].map(([label, value]) => (
                  <div key={label} className="px-2 text-center first:pl-0 last:pr-0">
                    <p className="text-lg font-semibold text-slate-100">{value}</p>
                    <p className="mt-1 text-[10px] text-slate-600">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 border-y border-[#242a33] bg-[#0d1117]">
        <div className="mx-auto grid max-w-7xl divide-y divide-[#242a33] px-4 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:px-6">
          <Fact value="4 criteria" label="used for every decision" />
          <Fact value="Live record" label="with separate speaker transcripts" />
          <Fact value="Immediate" label="profile and ranking updates" />
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28">
        <div className="max-w-2xl">
          <p className="section-kicker">How it works</p>
          <h2 className="font-editorial mt-4 text-4xl tracking-[-0.035em] text-[#f4f3ef] sm:text-5xl">From motion to decision.</h2>
          <p className="mt-4 text-base leading-7 text-slate-500">A simple workflow that keeps attention on the argument rather than the software.</p>
        </div>
        <div className="mt-12 grid gap-px overflow-hidden rounded-xl border border-[#282e38] bg-[#282e38] md:grid-cols-3">
          {workflow.map((item) => (
            <article key={item.number} className="bg-[#11151b] p-7 sm:p-8">
              <span className="font-mono text-xs text-[#7593dc]">{item.number}</span>
              <h3 className="mt-8 text-lg font-semibold text-white">{item.title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-500">{item.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="relative z-10 border-y border-[#242a33] bg-[#0d1117]">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[.8fr_1.2fr] lg:py-24">
          <div>
            <p className="section-kicker">Designed for the room</p>
            <h2 className="font-editorial mt-4 text-4xl leading-tight tracking-[-0.035em] text-[#f4f3ef]">Everything needed to run a credible debate.</h2>
            <p className="mt-4 text-sm leading-7 text-slate-500">No dashboards full of novelty features. Just the controls, record, and feedback a real session needs.</p>
          </div>
          <div className="grid gap-x-10 gap-y-9 sm:grid-cols-2">
            {capabilities.map(({ icon: Icon, title, copy }) => (
              <div key={title} className="border-t border-[#303744] pt-5">
                <Icon className="h-5 w-5 text-[#829ee3]" />
                <h3 className="mt-4 font-semibold text-slate-100">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">{copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24">
        <div className="grid items-center gap-8 rounded-xl border border-[#2b323d] bg-[#12161d] p-6 sm:p-8 lg:grid-cols-[1fr_auto]">
          <div>
            <div className="flex items-center gap-3"><MessageSquareText className="h-5 w-5 text-[#829ee3]" /><h2 className="text-xl font-semibold text-white">Already have a room link?</h2></div>
            <p className="mt-2 text-sm text-slate-500">Enter the debate ID to go directly to the room.</p>
          </div>
          <form onSubmit={joinDebate} className="flex w-full max-w-lg gap-2">
            <input value={debateId} onChange={(event) => setDebateId(event.target.value)} placeholder="Debate ID" aria-label="Debate ID" className="h-11 min-w-0 flex-1 rounded-lg border border-[#303744] bg-[#0d1117] px-4 font-mono text-sm text-white outline-none transition placeholder:font-sans placeholder:text-slate-600 focus:border-[#5d86ed] focus:ring-2 focus:ring-[#5d86ed]/15" />
            <button type="submit" disabled={!debateId.trim()} className="inline-flex h-11 items-center gap-2 rounded-lg border border-[#303744] bg-[#1a2029] px-5 text-sm font-semibold text-white transition hover:border-[#465064] hover:bg-[#202732] disabled:cursor-not-allowed disabled:opacity-40">Open room <ArrowRight className="h-4 w-4" /></button>
          </form>
        </div>
      </section>

      <footer className="relative z-10 border-t border-[#242a33] bg-[#090b0f]">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-7 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span className="flex items-center gap-2 font-semibold text-slate-400"><Scale className="h-4 w-4" /> DebateArena</span>
          <div className="flex gap-5"><span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" />Secure sessions</span><span className="inline-flex items-center gap-1.5"><LockKeyhole className="h-3.5 w-3.5" />Private rooms</span><span className="inline-flex items-center gap-1.5"><Users className="h-3.5 w-3.5" />Public viewing</span></div>
        </div>
      </footer>
    </div>
  );
}

function Speaker({ side, name, active = false }: { side: string; name: string; active?: boolean }) {
  return (
    <div className={`rounded-lg border p-3.5 ${active ? "border-[#425a8f] bg-[#172035]" : "border-[#282e38] bg-[#141820]"}`}>
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-[#242b36] text-xs font-semibold text-slate-200">{name.charAt(0)}</span>
        <div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">{side}</p><p className="mt-0.5 truncate text-xs font-medium text-slate-200">{name}</p></div>
      </div>
    </div>
  );
}

function Fact({ value, label }: { value: string; label: string }) {
  return <div className="px-2 py-6 sm:px-8"><p className="text-sm font-semibold text-slate-200">{value}</p><p className="mt-1 text-xs text-slate-600">{label}</p></div>;
}
