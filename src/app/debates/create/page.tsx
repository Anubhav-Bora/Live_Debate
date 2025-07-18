"use client"
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
import {
  ArrowLeft,
  Sparkles,
  Clock,
  Globe,
  Lock,
  Copy,
  CheckCircle,
  Zap,
  MessageSquare,
  Brain,
  Target,
  Settings,
} from "lucide-react"

export default function CreateDebatePage() {
  const { user } = useUser()
  const router = useRouter()
  const [topic, setTopic] = useState("")
  const [duration, setDuration] = useState(180)
  const [isPublic, setIsPublic] = useState(true)
  const [loading, setLoading] = useState(false)
  const [createdDebate, setCreatedDebate] = useState<any>(null)

  const handleCreate = async () => {
    if (!topic.trim()) {
      toast.error("Topic is required")
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/debates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          topic,
          duration,
          isPublic,
        }),
      })
      if (res.ok) {
        const data = await res.json()
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
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
          >
            <GlowCard className="max-w-md mx-auto text-center backdrop-blur-lg bg-white/5">
              <CardHeader>
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                  className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-red-500 to-pink-600 flex items-center justify-center"
                >
                  <Lock className="w-8 h-8 text-white" />
                </motion.div>
                <CardTitle className="text-2xl font-bold text-white">Authentication Required</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300 mb-6">You need to sign in to create a debate arena</p>
                <NeonButton onClick={() => router.push("/sign-in")}>Sign In to Continue</NeonButton>
              </CardContent>
            </GlowCard>
          </motion.div>
        </div>
      </div>
    )
  }

  if (createdDebate) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <AnimatedBackground />
        <div className="relative z-10 container mx-auto px-4 py-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto">
            <GlowCard
              glowColor="rgba(34, 197, 94, 0.4)"
              className="backdrop-blur-lg bg-white/5 relative overflow-hidden"
            >
              {/* Success pattern background */}
              <div className="absolute inset-0 opacity-10">
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundImage: `radial-gradient(circle at 2px 2px, rgba(34, 197, 94, 0.3) 1px, transparent 0)`,
                    backgroundSize: "30px 30px",
                  }}
                />
              </div>

              <CardHeader className="text-center relative z-10">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center relative"
                >
                  <CheckCircle className="w-12 h-12 text-white" />
                  <motion.div
                    className="absolute inset-0 rounded-full border-4 border-green-400"
                    animate={{ scale: [1, 1.2, 1], opacity: [1, 0, 1] }}
                    transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                  />
                </motion.div>

                <CardTitle className="text-3xl md:text-4xl font-bold text-white mb-4">
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-emerald-400">
                    Arena Created Successfully!
                  </span>
                </CardTitle>
                <CardDescription className="text-gray-300 text-lg">
                  Your intellectual battleground is ready. Share these credentials with your opponent.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-8 relative z-10">
                <div className="grid md:grid-cols-2 gap-6">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <Label className="text-white font-semibold mb-3 block flex items-center gap-2">
                      <Target className="w-4 h-4 text-indigo-400" />
                      Debate Arena ID
                    </Label>
                    <div className="relative">
                      <Input
                        value={createdDebate.id}
                        readOnly
                        className="bg-white/10 border-white/20 text-white font-mono text-center pr-12 focus:border-indigo-400"
                      />
                      <motion.button
                        onClick={() => copyToClipboard(createdDebate.id, "Debate ID")}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 rounded-md bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 transition-colors"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <Copy className="w-4 h-4" />
                      </motion.button>
                    </div>
                    <p className="text-sm text-gray-400 mt-2">
                      Anyone can join the debate room using this ID to spectate.
                    </p>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 }}
                  >
                    <Label className="text-white font-semibold mb-3 block flex items-center gap-2">
                      <Zap className="w-4 h-4 text-red-400" />
                      Con Participant Code
                    </Label>
                    <div className="relative">
                      <Input
                        value={createdDebate.joinCodeCon}
                        readOnly
                        className="bg-white/10 border-white/20 text-white font-mono text-center pr-12 focus:border-red-400"
                      />
                      <motion.button
                        onClick={() => copyToClipboard(createdDebate.joinCodeCon, "Con Code")}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 rounded-md bg-red-500/20 hover:bg-red-500/30 text-red-300 transition-colors"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <Copy className="w-4 h-4" />
                      </motion.button>
                    </div>
                    <p className="text-sm text-gray-400 mt-2">
                      Share this secret code with your opponent to let them join as the Con participant.
                    </p>
                  </motion.div>
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/30 rounded-lg p-6"
                >
                  <h4 className="text-indigo-300 font-semibold mb-4 flex items-center gap-2 text-lg">
                    <Sparkles className="w-5 h-5" />
                    Next Steps
                  </h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 text-gray-300">
                        <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                          1
                        </div>
                        <span>Share the Debate ID with spectators</span>
                      </div>
                      <div className="flex items-center gap-3 text-gray-300">
                        <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center text-white text-xs font-bold">
                          2
                        </div>
                        <span>Send the Con Code to your opponent</span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 text-gray-300">
                        <div className="w-6 h-6 rounded-full bg-pink-500 flex items-center justify-center text-white text-xs font-bold">
                          3
                        </div>
                        <span>Enter the arena and prepare</span>
                      </div>
                      <div className="flex items-center gap-3 text-gray-300">
                        <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold">
                          4
                        </div>
                        <span>Start when both participants are ready</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </CardContent>

              <CardFooter className="flex justify-center relative z-10">
                <Link href={`/debates/${createdDebate.id}`}>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <NeonButton size="lg" className="text-xl px-12 py-4">
                      <Zap className="w-6 h-6 mr-2" />
                      Enter Debate Arena
                    </NeonButton>
                  </motion.div>
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
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto">
          {/* Enhanced Header */}
          <div className="text-center mb-12">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
              className="relative inline-block"
            >
              <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg blur opacity-25"></div>
              <h1 className="relative text-4xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 mb-4 neon-text">
                Create Debate Arena
              </h1>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center justify-center gap-3 mb-6"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
              >
                <Brain className="w-6 h-6 text-indigo-400" />
              </motion.div>
              <p className="text-xl text-gray-300">Set up your intellectual battleground</p>
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
              >
                <Target className="w-6 h-6 text-purple-400" />
              </motion.div>
            </motion.div>
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <GlowCard className="backdrop-blur-lg bg-white/5 relative overflow-hidden">
              {/* Background pattern */}
              <div className="absolute inset-0 opacity-5">
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundImage: `radial-gradient(circle at 2px 2px, rgba(99, 102, 241, 0.3) 1px, transparent 0)`,
                    backgroundSize: "25px 25px",
                  }}
                />
              </div>

              <CardHeader className="relative z-10">
                <CardTitle className="text-2xl font-bold text-white flex items-center gap-3">
                  <motion.div
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 10, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                    className="w-8 h-8 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center"
                  >
                    <Settings className="w-4 h-4 text-white" />
                  </motion.div>
                  Arena Configuration
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-8 relative z-10">
                <div className="space-y-3">
                  <Label htmlFor="topic" className="text-white font-semibold flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-indigo-400" />
                    Debate Topic
                  </Label>
                  <Textarea
                    id="topic"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Enter the debate topic that will ignite intellectual discourse..."
                    className="min-h-[120px] bg-white/5 border-white/20 text-white placeholder:text-gray-400 resize-none focus:border-indigo-400 focus:ring-indigo-400/50"
                    required
                  />
                  <p className="text-sm text-gray-400 flex items-center gap-2">
                    <Sparkles className="w-3 h-3" />
                    Choose a compelling topic that allows for strong arguments on both sides.
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label htmlFor="duration" className="text-white font-semibold flex items-center gap-2">
                      <Clock className="w-4 h-4 text-green-400" />
                      Duration (seconds)
                    </Label>
                    <div className="relative">
                      <Input
                        id="duration"
                        type="number"
                        value={duration}
                        onChange={(e) => setDuration(Number(e.target.value))}
                        min="60"
                        max="1800"
                        className="bg-white/5 border-white/20 text-white focus:border-green-400 focus:ring-green-400/50"
                      />
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-400">
                        {Math.floor(duration / 60)}m {duration % 60}s
                      </div>
                    </div>
                    <p className="text-sm text-gray-400">Recommended: 180 seconds for focused discussions.</p>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-white font-semibold flex items-center gap-2">
                      <Globe className="w-4 h-4 text-blue-400" />
                      Visibility Settings
                    </Label>
                    <div className="space-y-3">
                      <motion.div
                        className="flex items-center space-x-3 p-3 rounded-lg bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition-colors"
                        onClick={() => setIsPublic(true)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <input
                          type="radio"
                          id="public"
                          checked={isPublic}
                          onChange={() => setIsPublic(true)}
                          className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                        />
                        <Label htmlFor="public" className="text-white flex items-center gap-2 cursor-pointer">
                          <Globe className="w-4 h-4 text-green-400" />
                          Public Arena
                        </Label>
                      </motion.div>

                      <motion.div
                        className="flex items-center space-x-3 p-3 rounded-lg bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition-colors"
                        onClick={() => setIsPublic(false)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <input
                          type="radio"
                          id="private"
                          checked={!isPublic}
                          onChange={() => setIsPublic(false)}
                          className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                        />
                        <Label htmlFor="private" className="text-white flex items-center gap-2 cursor-pointer">
                          <Lock className="w-4 h-4 text-yellow-400" />
                          Private Arena
                        </Label>
                      </motion.div>
                    </div>
                    <p className="text-sm text-gray-400">
                      Public arenas can be discovered by anyone, while private arenas require direct invitation.
                    </p>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="flex justify-between gap-4 relative z-10">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <NeonButton variant="outline" onClick={() => router.push("/debates")} disabled={loading}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Cancel
                  </NeonButton>
                </motion.div>

                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <NeonButton
                    onClick={handleCreate}
                    disabled={loading || !topic.trim()}
                    className="relative overflow-hidden"
                  >
                    {loading ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                          className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
                        />
                        Creating Arena...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Create Arena
                      </>
                    )}
                  </NeonButton>
                </motion.div>
              </CardFooter>
            </GlowCard>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}
