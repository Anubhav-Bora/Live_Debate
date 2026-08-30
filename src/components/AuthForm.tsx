"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, AtSign, Eye, EyeOff, Gavel, Loader2, LockKeyhole, UserRound } from "lucide-react";
import { toast } from "sonner";
import { AnimatedBackground } from "@/components/ui/animated-background";
import { useAuth } from "@/context/AuthContext";

export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const signingUp = mode === "sign-up";
  const router = useRouter();
  const { refresh } = useAuth();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (signingUp && password !== confirmation) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email, username, password }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "Authentication failed.");
      await refresh();
      toast.success(signingUp ? "Account created. Welcome to DebateArena." : "Welcome back.");
      router.replace("/debates");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Authentication failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden px-4 py-12">
      <AnimatedBackground />
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="relative z-10 grid w-full max-w-4xl overflow-hidden rounded-xl border border-[#2b323d] bg-[#12161d] shadow-[0_28px_80px_-44px_rgba(0,0,0,.95)] lg:grid-cols-[.88fr_1.12fr]"
      >
        <aside className="hidden border-r border-[#282e38] bg-[#0f1319] p-10 lg:flex lg:flex-col lg:justify-between">
          <div>
            <span className="grid h-10 w-10 place-items-center rounded-lg border border-[#34415a] bg-[#172035]"><Gavel className="h-5 w-5 text-[#8aa7ed]" /></span>
            <h1 className="font-editorial mt-8 text-4xl leading-tight tracking-[-0.035em] text-[#f4f3ef]">
              {signingUp ? "A place for arguments that matter." : "Good to have you back."}
            </h1>
            <p className="mt-4 max-w-sm text-sm leading-7 text-slate-500">
              Keep your debates, results, and progress together in one private account.
            </p>
          </div>
          <div className="grid gap-3 border-t border-[#282e38] pt-6 text-sm text-slate-500">
            {["Secure account sessions", "Private debate rooms", "No social sign-in required"].map((item) => (
              <div key={item} className="flex items-center gap-3"><span className="h-1.5 w-1.5 rounded-full bg-[#7694df]" />{item}</div>
            ))}
          </div>
        </aside>

        <section className="p-6 sm:p-10 lg:p-12">
          <div className="mx-auto max-w-md">
            <p className="section-kicker">{signingUp ? "Create an account" : "Account access"}</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.025em] text-white">
              {signingUp ? "Create your account" : "Sign in"}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              {signingUp ? "Set up your debater profile in under a minute." : "Sign in with your email and password."}
            </p>

            <form onSubmit={submit} className="mt-8 space-y-5">
              {signingUp && (
                <Field label="Username" icon={UserRound}>
                  <input required minLength={3} maxLength={24} pattern="[a-zA-Z0-9_-]+" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="sharp_mind" className="auth-input" />
                </Field>
              )}

              <Field label="Email" icon={AtSign}>
                <input required type="email" maxLength={254} autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="auth-input" />
              </Field>

              <Field label="Password" icon={LockKeyhole}>
                <input required type={showPassword ? "text" : "password"} minLength={signingUp ? 10 : undefined} maxLength={128} autoComplete={signingUp ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={signingUp ? "10+ characters, letter and number" : "Enter your password"} className="auth-input pr-11" />
                <button type="button" onClick={() => setShowPassword((visible) => !visible)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-500 transition hover:text-white" aria-label={showPassword ? "Hide password" : "Show password"}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </Field>

              {signingUp && (
                <Field label="Confirm password" icon={LockKeyhole}>
                  <input required type={showPassword ? "text" : "password"} minLength={10} maxLength={128} autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="Repeat your password" className="auth-input" />
                </Field>
              )}

              {error && <p role="alert" className="rounded-lg border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p>}

              <button type="submit" disabled={submitting} className="group flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-[#5d86ed] bg-[#4f73d9] text-sm font-semibold text-white transition hover:bg-[#5a7ee0] disabled:cursor-not-allowed disabled:opacity-60">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <>{signingUp ? "Create secure account" : "Sign in"}<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></>}
              </button>
            </form>

            <p className="mt-7 text-center text-sm text-slate-500">
              {signingUp ? "Already have an account?" : "New to DebateArena?"}{" "}
              <Link href={signingUp ? "/sign-in" : "/sign-up"} className="font-semibold text-[#8aa7ed] transition hover:text-[#a5b9ea]">
                {signingUp ? "Sign in" : "Create one"}
              </Link>
            </p>
          </div>
        </section>
      </motion.div>
    </div>
  );
}

function Field({ label, icon: Icon, children }: { label: string; icon: typeof AtSign; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.13em] text-slate-400">{label}</span>
      <span className="relative block">
        <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
        {children}
      </span>
    </label>
  );
}
