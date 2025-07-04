"use client"

import { useUser } from "@clerk/nextjs"
import Link from "next/link"
import { motion } from "framer-motion"
import { CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useState, useEffect } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { AnimatedBackground } from "@/components/ui/animated-background"
import { GlowCard } from "@/components/ui/glow-card"
import { NeonButton } from "@/components/ui/neon-button"
import { Search, Plus, Filter, MessageSquare, Clock, Eye, Zap, Target, Trophy, Trash2 } from "lucide-react"
import { toast } from "sonner"

interface Debate {
  id: string
  topic: string
  status: "waiting" | "in-progress" | "completed"
  createdAt: string
  proUser: { username: string; clerkId: string } | null
  conUser: { username: string; clerkId: string } | null
  _count: { messages: number }
}

export default function DebatesPage() {
  const { isSignedIn, user } = useUser()
  const [debates, setDebates] = useState<Debate[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filter, setFilter] = useState<"all" | "waiting" | "in-progress" | "completed">("all")

  useEffect(() => {
    const fetchDebates = async () => {
      try {
        const res = await fetch("/api/debates")
        if (res.ok) {
          const data = await res.json()
          setDebates(data)
        }
      } catch (error) {
        console.error("Error fetching debates:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchDebates()
  }, [])

  const filteredDebates = debates.filter((debate) => {
    const matchesSearch = debate.topic.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filter === "all" || debate.status === filter
    return matchesSearch && matchesFilter
  })

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "waiting":
        return {
          color: "from-yellow-500 to-orange-500",
          icon: <Clock className="w-4 h-4" />,
          text: "Waiting",
          glow: "rgba(245, 158, 11, 0.3)",
        }
      case "in-progress":
        return {
          color: "from-green-500 to-emerald-500",
          icon: <Zap className="w-4 h-4" />,
          text: "Live",
          glow: "rgba(34, 197, 94, 0.3)",
        }
      case "completed":
        return {
          color: "from-blue-500 to-indigo-500",
          icon: <Trophy className="w-4 h-4" />,
          text: "Completed",
          glow: "rgba(59, 130, 246, 0.3)",
        }
      default:
        return {
          color: "from-gray-500 to-gray-600",
          icon: <Clock className="w-4 h-4" />,
          text: "Unknown",
          glow: "rgba(107, 114, 128, 0.3)",
        }
    }
  }

  const filterOptions = [
    { value: "all", label: "All Arenas", icon: <Filter className="w-4 h-4" /> },
    { value: "waiting", label: "Waiting", icon: <Clock className="w-4 h-4" /> },
    { value: "in-progress", label: "Live", icon: <Zap className="w-4 h-4" /> },
    { value: "completed", label: "Completed", icon: <Trophy className="w-4 h-4" /> },
  ]

  const handleDeleteDebate = async (debateId: string, event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    if (!user?.id) return
    if (!confirm("Are you sure you want to delete this debate? This action cannot be undone.")) return
    try {
      const res = await fetch(`/api/debates/${debateId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      })
      if (res.ok) {
        setDebates(prev => prev.filter(d => d.id !== debateId))
        toast.success("Debate deleted successfully")
      } else {
        const errorData = await res.json()
        toast.error(errorData.error || "Failed to delete debate")
      }
    } catch {
      toast.error("An error occurred while deleting the debate")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <AnimatedBackground />
        <div className="relative z-10 container mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-8">
            <Skeleton className="h-12 w-64 bg-white/10" />
            {isSignedIn && <Skeleton className="h-10 w-40 bg-white/10" />}
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <GlowCard key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-full bg-white/10" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-3/4 mb-2 bg-white/10" />
                  <Skeleton className="h-4 w-1/2 bg-white/10" />
                </CardContent>
                <CardFooter>
                  <Skeleton className="h-4 w-20 bg-white/10" />
                </CardFooter>
              </GlowCard>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <AnimatedBackground />

      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">Debate Arena</h1>
            <p className="text-xl text-gray-300">Join the intellectual battleground</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex gap-4">
            {isSignedIn && (
              <Link href="/debates/create">
                <NeonButton size="lg">
                  <Plus className="w-5 h-5 mr-2" />
                  Create Arena
                </NeonButton>
              </Link>
            )}
          </motion.div>
        </div>

        {/* Search and Filter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <GlowCard>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                <Input
                  placeholder="Search debate topics..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-gray-400 h-12"
                />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {filterOptions.map((option) => (
                  <NeonButton
                    key={option.value}
                    variant={filter === option.value ? "primary" : "outline"}
                    size="sm"
                    onClick={() => setFilter(option.value as any)}
                    className="whitespace-nowrap"
                  >
                    {option.icon}
                    <span className="ml-2">{option.label}</span>
                  </NeonButton>
                ))}
              </div>
            </div>
          </GlowCard>
        </motion.div>

        {/* Debates Grid */}
        {filteredDebates.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-center py-16"
          >
            <GlowCard className="max-w-md mx-auto">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 text-indigo-400 opacity-50" />
              <h3 className="text-2xl font-bold text-white mb-2">No Arenas Found</h3>
              <p className="text-gray-300 mb-6">
                {filter === "all"
                  ? "Be the first to create a debate arena"
                  : `No ${filter.replace("-", " ")} debates available`}
              </p>
              {isSignedIn && (
                <Link href="/debates/create">
                  <NeonButton>
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Arena
                  </NeonButton>
                </Link>
              )}
            </GlowCard>
          </motion.div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredDebates.map((debate, index) => {
              const statusConfig = getStatusConfig(debate.status)

              return (
                <motion.div
                  key={debate.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  whileHover={{ y: -5 }}
                >
                  <Link href={`/debates/${debate.id}`}>
                    <GlowCard glowColor={statusConfig.glow} className="h-full cursor-pointer group relative">
                      {/* Delete Button - Only show for debate creator */}
                      {debate.proUser?.clerkId === user?.id && (
                        <button
                          onClick={e => handleDeleteDebate(debate.id, e)}
                          className="absolute top-3 right-3 z-10 p-2 rounded-full bg-red-500/20 border border-red-500/30 text-red-300 hover:bg-red-500/30 transition-all"
                          title="Delete debate"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                      
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start mb-2">
                          <Badge className={`bg-gradient-to-r ${statusConfig.color} text-white px-3 py-1`}>
                            {statusConfig.icon}
                            <span className="ml-2">{statusConfig.text}</span>
                          </Badge>
                        </div>
                        <CardTitle className="line-clamp-2 text-lg text-white group-hover:text-indigo-300 transition-colors">
                          {debate.topic}
                        </CardTitle>
                        <div className="text-xs text-gray-400 mt-1">
                          {new Date(debate.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex items-center gap-2">
                            <Target className="w-4 h-4 text-green-400" />
                            <span className="text-sm text-gray-300">Pro:</span>
                            <span className="text-sm text-white truncate">{debate.proUser?.username || "Open"}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Zap className="w-4 h-4 text-red-400" />
                            <span className="text-sm text-gray-300">Con:</span>
                            <span className="text-sm text-white truncate">{debate.conUser?.username || "Open"}</span>
                          </div>
                        </div>
                      </CardContent>

                      <CardFooter className="flex justify-between items-center pt-3">
                        <div className="flex items-center gap-1 text-sm text-gray-400">
                          <MessageSquare className="w-4 h-4" />
                          <span>{debate._count.messages}</span>
                        </div>
                        <NeonButton variant="outline" size="sm">
                          <Eye className="w-4 h-4 mr-2" />
                          Enter
                        </NeonButton>
                      </CardFooter>
                    </GlowCard>
                  </Link>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
