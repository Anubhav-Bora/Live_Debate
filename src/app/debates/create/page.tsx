"use client"

import type React from "react"
import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import Link from "next/link"
import { motion } from "framer-motion"
import { AnimatedBackground } from "@/components/ui/animated-background"
import { GlowCard } from "@/components/ui/glow-card"
import { NeonButton } from "@/components/ui/neon-button"
import { ArrowLeft, Sparkles, Clock, Globe, Lock, Copy, CheckCircle, Zap, MessageSquare } from "lucide-react"

interface Debate {
  id: string
  joinCodeCon: string
  topic?: string
  duration?: number
  isPublic?: boolean
  createdAt?: string
  updatedAt?: string
}

export default function CreateDebatePage() {
  const { user } = useUser()
  const router = useRouter()
  const [topic, setTopic] = useState("")
  const [minutes, setMinutes] = useState<number | undefined>(undefined)
  const [seconds, setSeconds] = useState<number | undefined>(undefined)
  const [isPublic, setIsPublic] = useState(true)
  const [loading, setLoading] = useState(false)
  const [createdDebate, setCreatedDebate] = useState<Debate | null>(null)
  const [displayName, setDisplayName] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await handleCreate()
  }

  const handleCreate = async () => {
    if (!topic.trim()) {
      toast.error("Topic is required")
      return
    }
    if (!displayName.trim()) {
      toast.error("Display name is required")
      return
    }

    const minutesNum = minutes || 0
    const secondsNum = seconds || 0
    const totalSeconds = minutesNum * 60 + secondsNum
    
    if (totalSeconds < 60) {
      toast.error("Debate duration must be at least 1 minute")
      return
    }

    // No maximum duration limit

    setLoading(true)
    try {
      const res = await fetch("/api/debates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          topic,
          duration: totalSeconds,
          isPublic,
          proDisplayName: displayName,
        }),
      })
      if (res.ok) {
        const data: Debate = await res.json()
        setCreatedDebate(data)
        toast.success("Debate created successfully!")
      } else {
        const errorData = await res.json()
        toast.error(errorData.error || "Failed to create debate")
      }
    } catch (err) {
      console.error(err)
      toast.error("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied to clipboard!`)
  }

  if (!user) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <AnimatedBackground />
        <div className="relative z-10 container mx-auto px-4 py-8 flex items-center justify-center min-h-screen">
          <GlowCard className="max-w-md mx-auto text-center">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-white flex items-center justify-center gap-2">
                <Lock className="w-6 h-6 text-indigo-400" />
                Authentication Required
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-300 mb-6">You need to sign in to create a debate arena</p>
              <NeonButton onClick={() => router.push("/sign-in")}>Sign In to Continue</NeonButton>
            </CardContent>
          </GlowCard>
        </div>
      </div>
    )
  }

  if (createdDebate) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <AnimatedBackground />
        <div className="relative z-10 container mx-auto px-4 py-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto">
            <GlowCard glowColor="rgba(34, 197, 94, 0.4)">
              <CardHeader className="text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring" }}
                  className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center"
                >
                  <CheckCircle className="w-10 h-10 text-white" />
                </motion.div>
                <CardTitle className="text-3xl font-bold text-white mb-2">Debate Arena Created!</CardTitle>
                <CardDescription className="text-gray-300 text-lg">
                  Your intellectual battleground is ready. Share these credentials with your opponent.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-white font-semibold mb-2 block">Debate Arena ID</Label>
                    <div className="flex gap-2">
                      <Input
                        value={createdDebate.id}
                        readOnly
                        className="bg-white/5 border-white/20 text-white font-mono"
                      />
                      <NeonButton variant="outline" onClick={() => copyToClipboard(createdDebate.id, "Debate ID")}>
                        <Copy className="w-4 h-4" />
                      </NeonButton>
                    </div>
                    <p className="text-sm text-gray-400 mt-2">
                      Anyone can join the debate room using this ID to spectate.
                    </p>
                  </div>

                  <div>
                    <Label className="text-white font-semibold mb-2 block">Con Participant Code</Label>
                    <div className="flex gap-2">
                      <Input
                        value={createdDebate.joinCodeCon}
                        readOnly
                        className="bg-white/5 border-white/20 text-white font-mono"
                      />
                      <NeonButton
                        variant="outline"
                        onClick={() => copyToClipboard(createdDebate.joinCodeCon, "Con Code")}
                      >
                        <Copy className="w-4 h-4" />
                      </NeonButton>
                    </div>
                    <p className="text-sm text-gray-400 mt-2">
                      Share this secret code with your opponent to let them join as the Con participant.
                    </p>
                  </div>
                </div>

                <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-4">
                  <h4 className="text-indigo-300 font-semibold mb-2 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Next Steps
                  </h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Share the Debate ID with spectators</li>
                    <li>• Send the Con Code to your debate opponent</li>
                    <li>• Enter the arena and wait for your opponent</li>
                    <li>• Start the debate when both participants are ready</li>
                  </ul>
                </div>
              </CardContent>

              <CardFooter className="flex justify-center">
                <Link href={`/debates/${createdDebate.id}`}>
                  <NeonButton size="lg">
                    <Zap className="w-5 h-5 mr-2" />
                    Enter Debate Arena
                  </NeonButton>
                </Link>
              </CardFooter>
            </GlowCard>
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <AnimatedBackground />

      <div className="relative z-10 container mx-auto px-4 py-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Create Debate Arena</h1>
            <p className="text-xl text-gray-300">Set up your intellectual battleground</p>
          </div>

          <GlowCard>
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-white flex items-center gap-2">
                <MessageSquare className="w-6 h-6 text-indigo-400" />
                Arena Configuration
              </CardTitle>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="displayName" className="text-white font-semibold">
                    Your Display Name
                  </Label>
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    placeholder="Enter your name as it will appear in the debate"
                    className="bg-white/5 border-white/20 text-white placeholder:text-gray-400"
                    required
                  />
                  <p className="text-sm text-gray-400">
                    This name will be shown in the debate instead of your email or username.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="topic" className="text-white font-semibold">
                    Debate Topic
                  </Label>
                  <Textarea
                    id="topic"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Enter the debate topic that will ignite intellectual discourse..."
                    className="min-h-[120px] bg-white/5 border-white/20 text-white placeholder:text-gray-400 resize-none"
                    required
                  />
                  <p className="text-sm text-gray-400">
                    Enter any debate topic of any length. You can now create multiple debates with the same topic.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-white font-semibold flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Duration
                  </Label>
                  <div className="flex gap-3 items-center">
                    <div className="flex-1">
                      <Label htmlFor="minutes" className="text-sm text-gray-300 mb-1 block">
                        Minutes
                      </Label>
                      <Input
                        id="minutes"
                        type="number"
                        value={minutes || ""}
                        onChange={(e) => {
                          const value = e.target.value
                          if (value === "") {
                            setMinutes(undefined)
                          } else {
                            const num = parseInt(value)
                            if (!isNaN(num) && num >= 0) {
                              setMinutes(num)
                            }
                          }
                        }}
                        min="0"
                        placeholder="0"
                        className="bg-white/5 border-white/20 text-white"
                      />
                    </div>
                    <div className="text-white text-xl font-bold mt-6">:</div>
                    <div className="flex-1">
                      <Label htmlFor="seconds" className="text-sm text-gray-300 mb-1 block">
                        Seconds
                      </Label>
                      <Input
                        id="seconds"
                        type="number"
                        value={seconds || ""}
                        onChange={(e) => {
                          const value = e.target.value
                          if (value === "") {
                            setSeconds(undefined)
                          } else {
                            const num = parseInt(value)
                            if (!isNaN(num) && num >= 0 && num <= 59) {
                              setSeconds(num)
                            }
                          }
                        }}
                        min="0"
                        max="59"
                        placeholder="0"
                        className="bg-white/5 border-white/20 text-white"
                      />
                    </div>
                  </div>
                  <p className="text-sm text-gray-400">
                    Set the debate duration. Minimum: 1 minute required. No maximum limit. Total: {(minutes || 0) * 60 + (seconds || 0)} seconds.
                  </p>
                </div>

                <div className="space-y-3">
                  <Label className="text-white font-semibold">Visibility Settings</Label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="isPublic"
                      checked={isPublic}
                      onChange={(e) => setIsPublic(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 bg-white/10 border-white/20"
                    />
                    <Label htmlFor="isPublic" className="text-white flex items-center gap-2">
                      {isPublic ? (
                        <>
                          <Globe className="w-4 h-4 text-green-400" />
                          Public Arena
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4 text-yellow-400" />
                          Private Arena
                        </>
                      )}
                    </Label>
                  </div>
                  <p className="text-sm text-gray-400">
                    Public arenas can be discovered by anyone, while private arenas require direct invitation.
                  </p>
                </div>
              </form>
            </CardContent>

            <CardFooter className="flex justify-end gap-4">
              <NeonButton variant="outline" onClick={() => router.push("/debates")} disabled={loading}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Cancel
              </NeonButton>
              <NeonButton 
                onClick={handleCreate} 
                disabled={loading || !topic.trim() || ((minutes || 0) * 60 + (seconds || 0)) < 60}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating Arena...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Create Arena
                  </>
                )}
              </NeonButton>
            </CardFooter>
          </GlowCard>
        </motion.div>
      </div>
    </div>
  )
}