"use client";

import type React from "react";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight, Gavel, LayoutGrid, LogOut, Menu, Plus, Trophy, X } from "lucide-react";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { SocketProvider } from "@/context/SocketContext";
import { cn } from "@/lib/utils";

const navigation = [
  { href: "/debates", label: "Explore", icon: LayoutGrid },
  { href: "/leaderboard", label: "Rankings", icon: Trophy },
];

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <SocketProvider>
        <AppChrome>{children}</AppChrome>
      </SocketProvider>
    </AuthProvider>
  );
}

function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoaded, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const logOut = async () => {
    await signOut();
    setMobileMenuOpen(false);
    router.push("/");
    router.refresh();
  };

  return (
    <>
      <Toaster position="top-center" richColors theme="dark" closeButton />

      <header className="sticky top-0 z-50 border-b border-[#252b34] bg-[#0d1117]/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="group flex items-center gap-3" aria-label="DebateArena home">
            <span className="grid h-9 w-9 place-items-center rounded-lg border border-[#34415a] bg-[#172035]">
              <Gavel className="h-[18px] w-[18px] text-[#8aa7ed]" />
            </span>
            <span className="leading-none">
              <span className="block text-[15px] font-bold tracking-[-0.02em] text-white">DebateArena</span>
                <span className="mt-1 block text-[9px] font-medium uppercase tracking-[0.14em] text-slate-500">Structured debate</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {navigation.map(({ href, label }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link key={href} href={href} className={cn("rounded-lg px-4 py-2 text-sm font-medium transition", active ? "bg-[#1b222d] text-white" : "text-slate-400 hover:bg-white/[0.035] hover:text-white")}>
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            {!isLoaded ? <span className="h-9 w-28 animate-pulse rounded-full bg-white/[0.05]" /> : user ? (
              <>
                <Link href="/debates/create" className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#5d86ed] bg-[#4f73d9] px-4 text-sm font-semibold text-white transition hover:bg-[#5a7ee0]">
                  <Plus className="h-4 w-4" /> New arena
                </Link>
                <Link href={`/profile/${user.id}`} title={user.username} className="grid h-9 w-9 place-items-center rounded-lg border border-[#34415a] bg-[#172035] text-sm font-bold uppercase text-[#b5c6f2] transition hover:border-[#4b5e82]">
                  {user.username.charAt(0)}
                </Link>
                <button type="button" onClick={logOut} title="Sign out" className="grid h-9 w-9 place-items-center rounded-full border border-white/10 text-slate-400 transition hover:border-rose-300/20 hover:bg-rose-500/10 hover:text-rose-200">
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            ) : (
              <>
                <Link href="/sign-in" className="h-9 rounded-lg border border-[#303744] px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-[#414b5c] hover:bg-white/[0.035]">Sign in</Link>
                <Link href="/sign-up" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#5d86ed] bg-[#4f73d9] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#5a7ee0]">
                  Get started <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </>
            )}
          </div>

          <button type="button" onClick={() => setMobileMenuOpen((open) => !open)} className="grid h-10 w-10 place-items-center rounded-lg border border-[#303744] bg-[#171c24] text-white md:hidden" aria-label={mobileMenuOpen ? "Close navigation" : "Open navigation"} aria-expanded={mobileMenuOpen}>
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden border-t border-[#252b34] bg-[#0d1117] md:hidden">
              <div className="mx-auto grid max-w-7xl gap-2 px-4 py-4">
                {navigation.map(({ href, label, icon: Icon }) => (
                  <Link key={href} href={href} onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-300 hover:bg-white/[0.06] hover:text-white">
                    <Icon className="h-4 w-4 text-[#8aa7ed]" /> {label}
                  </Link>
                ))}
                {user ? (
                  <>
                    <Link href="/debates/create" onClick={() => setMobileMenuOpen(false)} className="mt-1 flex items-center justify-center gap-2 rounded-lg bg-[#4f73d9] px-4 py-3 text-sm font-semibold text-white"><Plus className="h-4 w-4" /> Create a new arena</Link>
                    <button type="button" onClick={logOut} className="flex items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-slate-300"><LogOut className="h-4 w-4" /> Sign out</button>
                  </>
                ) : isLoaded ? (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Link href="/sign-in" onClick={() => setMobileMenuOpen(false)} className="rounded-xl border border-white/10 px-4 py-3 text-center text-sm font-semibold text-white">Sign in</Link>
                    <Link href="/sign-up" onClick={() => setMobileMenuOpen(false)} className="rounded-lg bg-[#4f73d9] px-4 py-3 text-center text-sm font-semibold text-white">Get started</Link>
                  </div>
                ) : null}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="relative">{children}</main>
    </>
  );
}
