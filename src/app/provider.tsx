"use client"

import type React from "react"

import { ClerkProvider, SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs"
import { Toaster } from "react-hot-toast"
import { SocketProvider } from "../context/SocketContext"
import Link from "next/link"
import { motion } from "framer-motion"
import { NeonButton } from "@/components/ui/neon-button"
import { MessageSquare, Trophy, Zap, Menu, X } from "lucide-react"
import { useState } from "react"

export function Providers({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <ClerkProvider>
      <SocketProvider>
        <Toaster position="top-center" />

        {/* Navigation Header */}
        <header className="relative z-50 border-b border-white/10 bg-black/20 backdrop-blur-lg">
          <div className="container mx-auto px-4 py-4">
            <div className="flex justify-between items-center">
              {/* Logo */}
              <Link href="/" className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-white" />
                </div>
                <span className="text-xl font-bold text-white">DebateArena</span>
              </Link>

              {/* Desktop Navigation */}
              <div className="hidden md:flex items-center gap-6">
                <SignedIn>
                  <nav className="flex items-center gap-4">
                    <Link href="/debates">
                      <NeonButton variant="outline" size="sm">
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Debates
                      </NeonButton>
                    </Link>
                    <Link href="/leaderboard">
                      <NeonButton variant="outline" size="sm">
                        <Trophy className="w-4 h-4 mr-2" />
                        Leaderboard
                      </NeonButton>
                    </Link>
                  </nav>
                  <UserButton
                    afterSignOutUrl="/"
                    appearance={{
                      elements: {
                        avatarBox:
                          "w-8 h-8 rounded-full border-2 border-indigo-500/50 hover:border-indigo-400 transition-colors",
                      },
                    }}
                  />
                </SignedIn>

                <SignedOut>
                  <SignInButton mode="modal">
                    <NeonButton variant="outline">Sign In</NeonButton>
                  </SignInButton>
                </SignedOut>
              </div>

              {/* Mobile Menu Button */}
              <div className="md:hidden">
                <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-white p-2">
                  {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
              </div>
            </div>

            {/* Mobile Navigation */}
            {mobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="md:hidden mt-4 pb-4 border-t border-white/10 pt-4"
              >
                <SignedIn>
                  <div className="flex flex-col gap-3">
                    <Link href="/debates" onClick={() => setMobileMenuOpen(false)}>
                      <NeonButton variant="outline" size="sm" className="w-full justify-start">
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Debates
                      </NeonButton>
                    </Link>
                    <Link href="/leaderboard" onClick={() => setMobileMenuOpen(false)}>
                      <NeonButton variant="outline" size="sm" className="w-full justify-start">
                        <Trophy className="w-4 h-4 mr-2" />
                        Leaderboard
                      </NeonButton>
                    </Link>
                  </div>
                </SignedIn>

                <SignedOut>
                  <SignInButton mode="modal">
                    <NeonButton variant="outline" className="w-full">
                      Sign In
                    </NeonButton>
                  </SignInButton>
                </SignedOut>
              </motion.div>
            )}
          </div>
        </header>

        {/* Main Content */}
        <main className="relative">{children}</main>
      </SocketProvider>
    </ClerkProvider>
  )
}
