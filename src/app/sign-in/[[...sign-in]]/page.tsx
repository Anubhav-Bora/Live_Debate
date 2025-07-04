"use client"

import { SignIn } from "@clerk/nextjs"
import { AnimatedBackground } from "@/components/ui/animated-background"
import { GlowCard } from "@/components/ui/glow-card"
import { motion } from "framer-motion"

export default function Page() {
  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center">
      <AnimatedBackground />

      <div className="relative z-10 w-full max-w-md mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-white mb-2">Welcome Back</h1>
          <p className="text-gray-300">Enter the arena of intellectual discourse</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <GlowCard className="p-0 overflow-hidden">
            <div className="bg-gradient-to-b from-white/5 to-white/10 p-8">
              <SignIn
                path="/sign-in"
                routing="path"
                signUpUrl="/sign-up"
                appearance={{
                  elements: {
                    formButtonPrimary:
                      "bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/25 transition-all duration-300",
                    card: "bg-transparent shadow-none",
                    headerTitle: "text-white text-2xl font-bold",
                    headerSubtitle: "text-gray-300",
                    socialButtonsBlockButton:
                      "bg-white/5 border-white/20 text-white hover:bg-white/10 transition-all duration-300",
                    formFieldInput:
                      "bg-white/5 border-white/20 text-white placeholder:text-gray-400 focus:border-indigo-500 focus:ring-indigo-500",
                    formFieldLabel: "text-gray-300",
                    footerActionLink: "text-indigo-400 hover:text-indigo-300",
                    identityPreviewText: "text-gray-300",
                    formButtonReset: "text-indigo-400 hover:text-indigo-300",
                  },
                }}
              />
            </div>
          </GlowCard>
        </motion.div>
      </div>
    </div>
  )
}
