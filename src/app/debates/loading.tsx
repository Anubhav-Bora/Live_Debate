import { AnimatedBackground } from "@/components/ui/animated-background"

export default function Loading() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <AnimatedBackground />
      <div className="relative z-10 mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="h-3 w-40 animate-pulse rounded bg-cyan-300/10" />
        <div className="mt-5 h-14 max-w-xl animate-pulse rounded-xl bg-white/[0.05]" />
        <div className="mt-4 h-5 max-w-2xl animate-pulse rounded bg-white/[0.03]" />
        <div className="mt-10 grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => <div key={index} className="surface-card h-20 animate-pulse bg-white/[0.025]" />)}
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => <div key={index} className="surface-card h-72 animate-pulse bg-white/[0.025]" />)}
        </div>
      </div>
    </div>
  )
}
