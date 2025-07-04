"use client"

import { useUser } from "@clerk/nextjs"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { motion } from "framer-motion"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"
import { AnimatedBackground } from "@/components/ui/animated-background"
import { GlowCard } from "@/components/ui/glow-card"
import { NeonButton } from "@/components/ui/neon-button"
import {
  User,
  Trophy,
  MessageSquare,
  Award,
  TrendingUp,
  Calendar,
  Edit,
  ArrowLeft,
  Target,
  Zap,
  Brain,
  Star,
} from "lucide-react"

interface UserProfile {
  id: string
  username: string
  email: string
  createdAt: string
  scores: Array<{
    logic: number
    clarity: number
    persuasiveness: number
    tone: number
    debate: { topic: string; id: string }
  }>
  badges: Array<{
    id: string
    name: string
    description: string
    icon: string
    earnedAt: string
  }>
  totalScore: number
  debateCount: number
}

export default function ProfilePage() {
  const { userId } = useParams()
  const { user: currentUser } = useUser()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true)
        const res = await fetch(`/api/users/${userId}`)
        if (res.ok) {
          const data = await res.json()
          setProfile(data)
        }
      } catch (error) {
        console.error("Error fetching profile:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [userId])

  const getScoreColor = (score: number) => {
    if (score >= 8) return "from-green-500 to-emerald-500"
    if (score >= 6) return "from-yellow-500 to-orange-500"
    return "from-red-500 to-pink-500"
  }

  const getScoreGlow = (score: number) => {
    if (score >= 8) return "rgba(34, 197, 94, 0.3)"
    if (score >= 6) return "rgba(245, 158, 11, 0.3)"
    return "rgba(239, 68, 68, 0.3)"
  }

  if (loading) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <AnimatedBackground />
        <div className="relative z-10 container mx-auto px-4 py-8">
          <div className="flex items-center space-x-6 mb-8">
            <Skeleton className="w-24 h-24 rounded-full bg-white/10" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-48 bg-white/10" />
              <Skeleton className="h-4 w-64 bg-white/10" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-32 bg-white/10" />
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton className="h-64 bg-white/10" />
            <Skeleton className="h-64 bg-white/10" />
          </div>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <AnimatedBackground />
        <div className="relative z-10 container mx-auto px-4 py-8 flex items-center justify-center min-h-screen">
          <GlowCard className="text-center">
            <User className="w-16 h-16 mx-auto mb-4 text-indigo-400 opacity-50" />
            <h2 className="text-2xl font-bold text-white mb-4">Profile Not Found</h2>
            <p className="text-gray-300 mb-6">The user profile you're looking for doesn't exist.</p>
            <Link href="/leaderboard">
              <NeonButton variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Leaderboard
              </NeonButton>
            </Link>
          </GlowCard>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <AnimatedBackground />
      
      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <GlowCard className="relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10" />
            <div className="absolute inset-0 opacity-20" style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, rgba(156, 146, 172, 0.15) 1px, transparent 0)`,
              backgroundSize: '20px 20px'
            }} />
            
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-6 p-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="relative"
              >
                <div className="w-24 h-24 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold animate-pulse-glow">
                  {profile.username.charAt(0).toUpperCase()}
                </div>
                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
                  <Star className="w-4 h-4 text-white" />
                </div>
              </motion.div>
              
              <div className="flex-1">
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                  {profile.username}
                </h1>
                <div className="flex items-center gap-2 text-gray-300 mb-4">
                  <Calendar className="w-4 h-4" />
                  <span>Member since {new Date(profile.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long"
                  })}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30">
                    Debate Champion
                  </Badge>
                  <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                    AI Analyzed
                  </Badge>
                </div>
              </div>
              
              {currentUser?.id === userId && (
                <NeonButton variant="outline">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Profile
                </NeonButton>
              )}
            </div>
          </GlowCard>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
        >
          <GlowCard glowColor="rgba(99, 102, 241, 0.3)">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Overall Score</h3>
              <Trophy className="w-6 h-6 text-indigo-400" />
            </div>
            <motion.p
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.4 }}
              className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400"
            >
              {profile.totalScore.toFixed(1)}
            </motion.p>
            <p className="text-gray-400 text-sm mt-2">Performance Rating</p>
          </GlowCard>

          <GlowCard glowColor="rgba(34, 197, 94, 0.3)">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Debates</h3>
              <MessageSquare className="w-6 h-6 text-green-400" />
            </div>
            <motion.p
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5 }}
              className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400"
            >
              {profile.debateCount}
            </motion.p>
            <p className="text-gray-400 text-sm mt-2">Total Participated</p>
          </GlowCard>

          <GlowCard glowColor="rgba(245, 158, 11, 0.3)">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Achievements</h3>
              <Award className="w-6 h-6 text-yellow-400" />
            </div>
            <motion.p
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.6 }}
              className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-400"
            >
              {profile.badges.length}
            </motion.p>
            <p className="text-gray-400 text-sm mt-2">Badges Earned</p>
          </GlowCard>
        </motion.div>

        {/* Performance & Badges */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Recent Performance */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7 }}
          >
            <GlowCard>
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-indigo-400" />
                  Recent Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                {profile.scores.length > 0 ? (
                  <div className="space-y-4">
                    {profile.scores.slice(0, 5).map((score, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.8 + index * 0.1 }}
                        className="border-b border-white/10 pb-4 last:border-b-0 last:pb-0"
                      >
                        <Link
                          href={`/debates/${score.debate.id}`}
                          className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors line-clamp-2 mb-3 block"
                        >
                          {score.debate.topic}
                        </Link>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-gray-400 text-sm flex items-center gap-1">
                                <Brain className="w-3 h-3" />
                                Logic
                              </span>
                              <Badge 
                                className={`bg-gradient-to-r ${getScoreColor(score.logic)} text-white px-2 py-0.5 text-xs`}
                                style={{ boxShadow: `0 0 10px ${getScoreGlow(score.logic)}` }}
                              >
                                {score.logic.toFixed(1)}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-400 text-sm flex items-center gap-1">
                                <Target className="w-3 h-3" />
                                Clarity
                              </span>
                              <Badge 
                                className={`bg-gradient-to-r ${getScoreColor(score.clarity)} text-white px-2 py-0.5 text-xs`}
                                style={{ boxShadow: `0 0 10px ${getScoreGlow(score.clarity)}` }}
                              >
                                {score.clarity.toFixed(1)}
                              </Badge>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-gray-400 text-sm flex items-center gap-1">
                                <Zap className="w-3 h-3" />
                                Persuasion
                              </span>
                              <Badge 
                                className={`bg-gradient-to-r ${getScoreColor(score.persuasiveness)} text-white px-2 py-0.5 text-xs`}
                                style={{ boxShadow: `0 0 10px ${getScoreGlow(score.persuasiveness)}` }}
                              >
                                {score.persuasiveness.toFixed(1)}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-400 text-sm flex items-center gap-1">
                                <Star className="w-3 h-3" />
                                Tone
                              </span>
                              <Badge 
                                className={`bg-gradient-to-r ${getScoreColor(score.tone)} text-white px-2 py-0.5 text-xs`}
                                style={{ boxShadow: `0 0 10px ${getScoreGlow(score.tone)}` }}
                              >
                                {score.tone.toFixed(1)}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <MessageSquare className="w-12 h-12 mx-auto mb-4 text-indigo-400 opacity-50" />
                    <p className="text-gray-400">No debate history yet</p>
                  </div>
                )}
              </CardContent>
            </GlowCard>
          </motion.div>

          {/* Badges */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7 }}
          >
            <GlowCard>
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Award className="w-5 h-5 text-yellow-400" />
                  Achievement Gallery
                </CardTitle>
              </CardHeader>
              <CardContent>
                {profile.badges.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {profile.badges.map((badge, index) => (
                      <motion.div
                        key={badge.id}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.8 + index * 0.1 }}
                        whileHover={{ scale: 1.05 }}
                        className="text-center p-4 rounded-lg bg-gradient-to-b from-white/5 to-white/10 border border-white/10 hover:border-yellow-500/30 transition-all"
                      >
                        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 flex items-center justify-center text-2xl animate-pulse-glow">
                          {badge.icon || "🏆"}
                        </div>
                        <h3 className="font-semibold text-white text-sm mb-1">{badge.name}</h3>
                        <p className="text-xs text-gray-400 mb-2 line-clamp-2">{badge.description}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(badge.earnedAt).toLocaleDateString()}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Award className="w-12 h-12 mx-auto mb-4 text-yellow-400 opacity-50" />
                    <p className="text-gray-400">No achievements yet</p>
                    <p className="text-gray-500 text-sm mt-2">Participate in debates to earn badges!</p>
                  </div>
                )}
              </CardContent>
            </GlowCard>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
