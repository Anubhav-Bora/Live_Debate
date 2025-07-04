"use client"

import { useEffect, useState } from "react"
import { CardContent } from "@/components/ui/card"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { motion } from "framer-motion"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { AnimatedBackground } from "@/components/ui/animated-background"
import { GlowCard } from "@/components/ui/glow-card"
import { NeonButton } from "@/components/ui/neon-button"
import { Trophy, Medal, Award, TrendingUp, Users, Target, Calendar, Crown } from "lucide-react"

interface UserScore {
  id: string
  username: string
  totalScore: number
  debateCount: number
  badges: number
}

export default function LeaderboardPage() {
  const [users, setUsers] = useState<UserScore[]>([])
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<"week" | "month" | "all">("week")

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true)
        const res = await fetch(`/api/leaderboard?range=${timeRange}`)
        if (res.ok) {
          const data = await res.json()
          setUsers(data)
        }
      } catch (error) {
        console.error("Error fetching leaderboard:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchLeaderboard()
  }, [timeRange])

  const getMedalConfig = (index: number) => {
    switch (index) {
      case 0:
        return {
          emoji: "🥇",
          color: "from-yellow-400 to-yellow-600",
          glow: "rgba(251, 191, 36, 0.4)",
          icon: <Crown className="w-6 h-6" />,
        }
      case 1:
        return {
          emoji: "🥈",
          color: "from-gray-300 to-gray-500",
          glow: "rgba(156, 163, 175, 0.4)",
          icon: <Medal className="w-6 h-6" />,
        }
      case 2:
        return {
          emoji: "🥉",
          color: "from-amber-600 to-amber-800",
          glow: "rgba(217, 119, 6, 0.4)",
          icon: <Award className="w-6 h-6" />,
        }
      default:
        return {
          emoji: index + 1,
          color: "from-indigo-500 to-purple-600",
          glow: "rgba(99, 102, 241, 0.3)",
          icon: <Target className="w-5 h-5" />,
        }
    }
  }

  const timeRangeOptions = [
    { value: "week", label: "This Week", icon: <Calendar className="w-4 h-4" /> },
    { value: "month", label: "This Month", icon: <Calendar className="w-4 h-4" /> },
    { value: "all", label: "All Time", icon: <TrendingUp className="w-4 h-4" /> },
  ]

  return (
    <div className="min-h-screen relative overflow-hidden">
      <AnimatedBackground />

      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 flex items-center justify-center gap-3">
            <Trophy className="w-12 h-12 text-yellow-400" />
            Hall of Fame
          </h1>
          <p className="text-xl text-gray-300">Champions of intellectual discourse</p>
        </motion.div>

        {/* Time Range Selector */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex justify-center mb-8"
        >
          <GlowCard>
            <div className="flex gap-2">
              {timeRangeOptions.map((option) => (
                <NeonButton
                  key={option.value}
                  variant={timeRange === option.value ? "primary" : "outline"}
                  onClick={() => setTimeRange(option.value as any)}
                >
                  {option.icon}
                  <span className="ml-2">{option.label}</span>
                </NeonButton>
              ))}
            </div>
          </GlowCard>
        </motion.div>

        {/* Leaderboard */}
        {loading ? (
          <GlowCard>
            <CardContent className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-12 rounded-full bg-white/10" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-32 bg-white/10" />
                    <Skeleton className="h-3 w-24 bg-white/10" />
                  </div>
                  <Skeleton className="h-8 w-16 bg-white/10" />
                </div>
              ))}
            </CardContent>
          </GlowCard>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.3 }}>
            {users.length === 0 ? (
              <GlowCard className="text-center py-16">
                <Users className="w-16 h-16 mx-auto mb-4 text-indigo-400 opacity-50" />
                <h3 className="text-2xl font-bold text-white mb-2">No Champions Yet</h3>
                <p className="text-gray-300">Participate in debates to appear on the leaderboard</p>
              </GlowCard>
            ) : (
              <>
                {/* Top 3 Podium */}
                {users.length >= 3 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="mb-12"
                  >
                    <div className="flex justify-center items-end gap-8 mb-8">
                      {/* Second Place */}
                      <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                        className="text-center"
                      >
                        <GlowCard glowColor={getMedalConfig(1).glow} className="p-6">
                          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-r from-gray-300 to-gray-500 flex items-center justify-center text-white font-bold text-2xl">
                            {users[1].username.charAt(0).toUpperCase()}
                          </div>
                          <h3 className="text-lg font-bold text-white mb-1">{users[1].username}</h3>
                          <Badge className="bg-gradient-to-r from-gray-300 to-gray-500 text-white mb-2">
                            {users[1].totalScore.toFixed(1)} pts
                          </Badge>
                          <div className="text-4xl mb-2">🥈</div>
                          <div className="text-sm text-gray-400">{users[1].debateCount} debates</div>
                        </GlowCard>
                      </motion.div>

                      {/* First Place */}
                      <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="text-center"
                      >
                        <GlowCard glowColor={getMedalConfig(0).glow} className="p-8 scale-110">
                          <Crown className="w-8 h-8 mx-auto mb-2 text-yellow-400" />
                          <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600 flex items-center justify-center text-white font-bold text-3xl animate-pulse-glow">
                            {users[0].username.charAt(0).toUpperCase()}
                          </div>
                          <h3 className="text-xl font-bold text-white mb-2">{users[0].username}</h3>
                          <Badge className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-white mb-3 text-lg px-4 py-1">
                            {users[0].totalScore.toFixed(1)} pts
                          </Badge>
                          <div className="text-5xl mb-2">🥇</div>
                          <div className="text-sm text-gray-400">{users[0].debateCount} debates</div>
                        </GlowCard>
                      </motion.div>

                      {/* Third Place */}
                      <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7 }}
                        className="text-center"
                      >
                        <GlowCard glowColor={getMedalConfig(2).glow} className="p-6">
                          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-r from-amber-600 to-amber-800 flex items-center justify-center text-white font-bold text-2xl">
                            {users[2].username.charAt(0).toUpperCase()}
                          </div>
                          <h3 className="text-lg font-bold text-white mb-1">{users[2].username}</h3>
                          <Badge className="bg-gradient-to-r from-amber-600 to-amber-800 text-white mb-2">
                            {users[2].totalScore.toFixed(1)} pts
                          </Badge>
                          <div className="text-4xl mb-2">🥉</div>
                          <div className="text-sm text-gray-400">{users[2].debateCount} debates</div>
                        </GlowCard>
                      </motion.div>
                    </div>
                  </motion.div>
                )}

                {/* Full Leaderboard Table */}
                <GlowCard>
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/10">
                        <TableHead className="text-gray-300 font-semibold">Rank</TableHead>
                        <TableHead className="text-gray-300 font-semibold">Debater</TableHead>
                        <TableHead className="text-right text-gray-300 font-semibold">Score</TableHead>
                        <TableHead className="text-right text-gray-300 font-semibold">Debates</TableHead>
                        <TableHead className="text-right text-gray-300 font-semibold">Badges</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user, index) => {
                        const medalConfig = getMedalConfig(index)

                        return (
                          <motion.tr
                            key={user.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: 0.5 + index * 0.05 }}
                            className="border-white/5 hover:bg-white/5 transition-colors"
                          >
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                {index < 3 ? (
                                  <div
                                    className={`w-8 h-8 rounded-full bg-gradient-to-r ${medalConfig.color} flex items-center justify-center text-white font-bold`}
                                  >
                                    {typeof medalConfig.emoji === "string" ? medalConfig.emoji : index + 1}
                                  </div>
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                                    {index + 1}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">
                                  {user.username.charAt(0).toUpperCase()}
                                </div>
                                <span className="text-white font-medium">{user.username}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant="outline" className="px-3 py-1 text-indigo-300 border-indigo-500/30">
                                {user.totalScore.toFixed(1)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right text-gray-300">{user.debateCount}</TableCell>
                            <TableCell className="text-right">
                              <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                                {user.badges}
                              </Badge>
                            </TableCell>
                          </motion.tr>
                        )
                      })}
                    </TableBody>
                  </Table>
                </GlowCard>
              </>
            )}
          </motion.div>
        )}
      </div>
    </div>
  )
}
