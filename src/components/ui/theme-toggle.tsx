"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Sun, Moon, Monitor, Palette } from "lucide-react"
import { NeonButton } from "./neon-button"
import { GlowCard } from "./glow-card"

type Theme = "light" | "dark" | "system"

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark")
  const [mounted, setMounted] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    setMounted(true)
    const savedTheme = localStorage.getItem("theme") as Theme
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"

    if (savedTheme) {
      setTheme(savedTheme)
      applyTheme(savedTheme, systemTheme)
    } else {
      setTheme("system")
      applyTheme("system", systemTheme)
    }
  }, [])

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    const handleChange = () => {
      if (theme === "system") {
        applyTheme("system", mediaQuery.matches ? "dark" : "light")
      }
    }

    mediaQuery.addEventListener("change", handleChange)
    return () => mediaQuery.removeEventListener("change", handleChange)
  }, [theme])

  const applyTheme = (selectedTheme: Theme, systemTheme: string) => {
    const root = document.documentElement

    // Add transition class
    root.classList.add("theme-transition-slow")

    if (selectedTheme === "system") {
      if (systemTheme === "dark") {
        root.classList.remove("light")
        root.classList.add("dark")
      } else {
        root.classList.remove("dark")
        root.classList.add("light")
      }
    } else {
      root.classList.remove("light", "dark")
      root.classList.add(selectedTheme)
    }

    // Remove transition class after animation
    setTimeout(() => {
      root.classList.remove("theme-transition-slow")
    }, 500)
  }

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme)
    localStorage.setItem("theme", newTheme)

    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
    applyTheme(newTheme, systemTheme)
    setIsOpen(false)
  }

  const getThemeIcon = (themeType: Theme) => {
    switch (themeType) {
      case "light":
        return <Sun className="w-4 h-4" />
      case "dark":
        return <Moon className="w-4 h-4" />
      case "system":
        return <Monitor className="w-4 h-4" />
    }
  }

  const getCurrentThemeLabel = () => {
    switch (theme) {
      case "light":
        return "Light Mode"
      case "dark":
        return "Dark Mode"
      case "system":
        return "System"
    }
  }

  if (!mounted) {
    return <div className="w-10 h-10 rounded-lg bg-white/5 animate-pulse" />
  }

  return (
    <div className="relative">
      <NeonButton
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="relative overflow-hidden group"
      >
        <motion.div
          key={theme}
          initial={{ rotate: -180, opacity: 0 }}
          animate={{ rotate: 0, opacity: 1 }}
          exit={{ rotate: 180, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center gap-2"
        >
          {getThemeIcon(theme)}
          <span className="hidden sm:inline">{getCurrentThemeLabel()}</span>
        </motion.div>

        {/* Animated background effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 animate-shimmer" />
      </NeonButton>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Theme Menu */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute right-0 top-full mt-2 z-50"
            >
              <GlowCard className="p-2 min-w-[200px]">
                <div className="flex items-center gap-2 p-2 mb-2 border-b border-white/10 dark:border-white/10">
                  <Palette className="w-4 h-4 text-indigo-400" />
                  <span className="text-sm font-medium text-foreground">Theme Selection</span>
                </div>

                <div className="space-y-1">
                  {(["light", "dark", "system"] as Theme[]).map((themeOption) => (
                    <motion.button
                      key={themeOption}
                      onClick={() => handleThemeChange(themeOption)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                        theme === themeOption
                          ? "bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-indigo-300 border border-indigo-500/30"
                          : "text-foreground hover:bg-white/5 dark:hover:bg-white/5"
                      }`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div
                        className={`p-1.5 rounded-md ${
                          theme === themeOption
                            ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white"
                            : "bg-white/10 dark:bg-white/10 text-muted-foreground"
                        }`}
                      >
                        {getThemeIcon(themeOption)}
                      </div>

                      <div className="flex-1 text-left">
                        <div className="font-medium">
                          {themeOption === "light" && "Light Mode"}
                          {themeOption === "dark" && "Dark Mode"}
                          {themeOption === "system" && "System"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {themeOption === "light" && "Bright futuristic interface"}
                          {themeOption === "dark" && "Deep space aesthetic"}
                          {themeOption === "system" && "Follow system preference"}
                        </div>
                      </div>

                      {theme === themeOption && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-2 h-2 rounded-full bg-gradient-to-r from-indigo-400 to-purple-400"
                        />
                      )}
                    </motion.button>
                  ))}
                </div>

                <div className="mt-3 pt-2 border-t border-white/10 dark:border-white/10">
                  <div className="text-xs text-muted-foreground px-2">Theme persists across sessions</div>
                </div>
              </GlowCard>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
