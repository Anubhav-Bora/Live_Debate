"use client"

import type React from "react"

import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs"
import { motion } from "framer-motion"
import Link from "next/link"
import { CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import { AnimatedBackground } from "@/components/ui/animated-background"
import { GlowCard } from "@/components/ui/glow-card"
import { NeonButton } from "@/components/ui/neon-button"
import { Sparkles, Zap, Trophy, MessageSquare, Brain, Users } from "lucide-react"

export default function Home() {
  const [debateId, setDebateId] = useState("")

  const handleJoinDebate = (e: React.FormEvent) => {
    e.preventDefault()
    if (debateId) {
      window.location.href = `/debates/${debateId}`
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <AnimatedBackground />

      <main className="relative z-10 container mx-auto px-4 py-16">
        {/* Hero Section */}
        <section className="text-center mb-20 relative">
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-8"
          >
            <h1 className="text-6xl md:text-8xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 neon-text">
              AI Debate Arena
            </h1>
            <div className="flex items-center justify-center gap-2 mb-6">
              <Sparkles className="w-6 h-6 text-indigo-400 animate-pulse" />
              <span className="text-xl text-gray-300">Powered by Artificial Intelligence</span>
              <Sparkles className="w-6 h-6 text-purple-400 animate-pulse" />
            </div>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto mb-12 leading-relaxed"
          >
            Step into the future of intellectual discourse. Engage in real-time debates, receive AI-powered insights,
            and master the art of persuasion.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="flex flex-col sm:flex-row justify-center gap-6 mb-16"
          >
            <SignedIn>
              <Link href="/debates/create">
                <NeonButton size="lg" className="min-w-[200px]">
                  <Zap className="w-5 h-5 mr-2" />
                  Create Debate
                </NeonButton>
              </Link>
              <Link href="/debates">
                <NeonButton variant="outline" size="lg" className="min-w-[200px]">
                  <MessageSquare className="w-5 h-5 mr-2" />
                  Browse Debates
                </NeonButton>
              </Link>
            </SignedIn>
            <SignedOut>
              <SignInButton mode="modal">
                <NeonButton size="lg" className="min-w-[200px]">
                  <Brain className="w-5 h-5 mr-2" />
                  Enter Arena
                </NeonButton>
              </SignInButton>
              <Link href="/sign-up">
                <NeonButton variant="outline" size="lg" className="min-w-[200px]">
                  <Users className="w-5 h-5 mr-2" />
                  Join Community
                </NeonButton>
              </Link>
            </SignedOut>
          </motion.div>

          {/* Floating orbs */}
          <div className="absolute top-20 left-10 w-20 h-20 bg-indigo-500/20 rounded-full blur-xl animate-float" />
          <div
            className="absolute top-40 right-20 w-32 h-32 bg-purple-500/20 rounded-full blur-xl animate-float"
            style={{ animationDelay: "2s" }}
          />
          <div
            className="absolute bottom-20 left-1/4 w-16 h-16 bg-pink-500/20 rounded-full blur-xl animate-float"
            style={{ animationDelay: "4s" }}
          />
        </section>

        {/* Join Debate Section */}
        <motion.section
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="mb-20"
        >
          <GlowCard className="max-w-md mx-auto">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-white mb-2">Quick Join</CardTitle>
              <CardDescription className="text-gray-300">
                Enter a debate ID to jump into an ongoing discussion
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleJoinDebate} className="flex gap-3">
                <Input
                  placeholder="Debate ID"
                  value={debateId}
                  onChange={(e) => setDebateId(e.target.value)}
                  className="bg-white/5 border-white/20 text-white placeholder:text-gray-400"
                />
                <NeonButton type="submit" disabled={!debateId.trim()}>
                  Join
                </NeonButton>
              </form>
            </CardContent>
          </GlowCard>
        </motion.section>

        {/* Features Section */}
        <section className="mb-20">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-4xl font-bold text-center mb-12 text-white"
          >
            Experience the Future of Debate
          </motion.h2>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: "Real-Time Debates",
                description:
                  "Engage in live, structured debates with participants worldwide using cutting-edge video technology",
                icon: <MessageSquare className="w-8 h-8" />,
                color: "rgba(99, 102, 241, 0.3)",
                gradient: "from-indigo-500 to-blue-600",
              },
              {
                title: "AI-Powered Analysis",
                description:
                  "Receive instant, detailed feedback on your arguments, logic, and presentation style from advanced AI",
                icon: <Brain className="w-8 h-8" />,
                color: "rgba(139, 92, 246, 0.3)",
                gradient: "from-purple-500 to-pink-600",
              },
              {
                title: "Global Leaderboard",
                description: "Climb the ranks, earn badges, and showcase your debating prowess to the world",
                icon: <Trophy className="w-8 h-8" />,
                color: "rgba(16, 185, 129, 0.3)",
                gradient: "from-emerald-500 to-teal-600",
              },
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                viewport={{ once: true }}
              >
                <GlowCard glowColor={feature.color} className="h-full">
                  <div
                    className={`w-16 h-16 rounded-full bg-gradient-to-r ${feature.gradient} flex items-center justify-center mb-6 mx-auto`}
                  >
                    <div className="text-white">{feature.icon}</div>
                  </div>
                  <CardTitle className="text-xl font-bold text-white mb-4 text-center">{feature.title}</CardTitle>
                  <CardDescription className="text-gray-300 text-center leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </GlowCard>
              </motion.div>
            ))}
          </div>
        </section>

        {/* How It Works */}
        <section className="mb-20">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-4xl font-bold text-center mb-16 text-white"
          >
            Master Debate in 4 Steps
          </motion.h2>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              {
                step: "01",
                title: "Create or Join",
                description: "Start a new debate topic or join an existing discussion",
                icon: "🚀",
              },
              {
                step: "02",
                title: "Get Connected",
                description: "Share your debate ID and connect with your opponent",
                icon: "🔗",
              },
              {
                step: "03",
                title: "Debate Live",
                description: "Engage in structured, timed debates with video and audio",
                icon: "⚡",
              },
              {
                step: "04",
                title: "AI Insights",
                description: "Receive detailed performance analysis and improvement tips",
                icon: "🧠",
              },
            ].map((step, index) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.15 }}
                viewport={{ once: true }}
                className="text-center relative"
              >
                <div className="relative mb-6">
                  <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center text-3xl mb-4 animate-pulse-glow">
                    {step.icon}
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-pink-500 to-red-500 rounded-full flex items-center justify-center text-xs font-bold text-white">
                    {step.step}
                  </div>
                </div>
                <h3 className="font-bold text-xl mb-3 text-white">{step.title}</h3>
                <p className="text-gray-300 leading-relaxed">{step.description}</p>

                {index < 3 && (
                  <div className="hidden md:block absolute top-10 -right-4 w-8 h-0.5 bg-gradient-to-r from-indigo-500 to-transparent" />
                )}
              </motion.div>
            ))}
          </div>
        </section>

        {/* Call to Action */}
        <motion.section
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <GlowCard className="max-w-2xl mx-auto">
            <h2 className="text-4xl font-bold mb-6 text-white">Ready to Elevate Your Voice?</h2>
            <p className="text-xl text-gray-300 mb-8">
              Join thousands of debaters sharpening their skills with AI-powered insights
            </p>
            <SignedIn>
              <Link href="/debates/create">
                <NeonButton size="lg" className="text-xl px-12 py-4">
                  <Sparkles className="w-6 h-6 mr-2" />
                  Start Your Journey
                </NeonButton>
              </Link>
            </SignedIn>
            <SignedOut>
              <SignInButton mode="modal">
                <NeonButton size="lg" className="text-xl px-12 py-4">
                  <Sparkles className="w-6 h-6 mr-2" />
                  Begin Your Journey
                </NeonButton>
              </SignInButton>
            </SignedOut>
          </GlowCard>
        </motion.section>
      </main>
    </div>
  )
}
