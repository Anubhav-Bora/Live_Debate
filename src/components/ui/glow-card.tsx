"use client"

import type React from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface GlowCardProps {
  children: React.ReactNode
  className?: string
  glowColor?: string
  hover?: boolean
}

export function GlowCard({ children, className, glowColor, hover = true }: GlowCardProps) {
  const getDefaultGlowColor = () => {
    if (typeof window !== "undefined") {
      const isDark =
        document.documentElement.classList.contains("dark") ||
        (!document.documentElement.classList.contains("light") &&
          window.matchMedia("(prefers-color-scheme: dark)").matches)
      return isDark ? "rgba(99, 102, 241, 0.3)" : "rgba(99, 102, 241, 0.2)"
    }
    return "rgba(99, 102, 241, 0.3)"
  }

  const finalGlowColor = glowColor || getDefaultGlowColor()

  return (
    <motion.div
      className={cn(
        "relative glass rounded-xl p-6 transition-all duration-300 theme-transition",
        hover && "hover:scale-[1.02]",
        className,
      )}
      whileHover={
        hover
          ? {
              boxShadow: `0 0 30px ${finalGlowColor}`,
              scale: 1.02,
            }
          : undefined
      }
      style={{
        boxShadow: `0 0 20px ${finalGlowColor}`,
      }}
    >
      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300 dark:via-white/5 light:via-black/5" />
      <div className="relative z-10">{children}</div>
    </motion.div>
  )
}
