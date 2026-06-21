'use client'

import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { Sun, Moon, Monitor, SidebarIcon } from 'lucide-react'
import { useUI } from '@/store/ui'

export function Header() {
  const { resolvedTheme, setTheme } = useTheme()
  const toggleSidebar = useUI((s) => s.toggleSidebar)
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const cycleTheme = () => {
    const next = resolvedTheme === 'dark' ? 'light' : 'dark'
    setTheme(next)
  }

  // Render a neutral icon until mounted so server and client HTML match.
  // After mount, next-themes has resolved the theme and we show the correct icon.
  const ThemeIcon = mounted ? (resolvedTheme === 'dark' ? Moon : Sun) : Monitor

  return (
    <header className="flex h-14 items-center border-b border-border bg-background px-4 gap-3 shrink-0 z-10">
      <button
        onClick={toggleSidebar}
        className="p-2 rounded-md hover:bg-accent transition-colors"
        aria-label="Toggle sidebar"
      >
        <SidebarIcon className="h-4 w-4" />
      </button>

      <div className="flex items-center gap-2">
        <div className="h-7 w-7 rounded-full bg-blue-500 flex items-center justify-center">
          <span className="text-white text-xs font-bold">W</span>
        </div>
        <span className="font-semibold text-sm tracking-tight">Watch Dog</span>
        <span className="text-xs text-muted-foreground hidden sm:inline">GTA Safety Map</span>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={cycleTheme}
          className="p-2 rounded-md hover:bg-accent transition-colors"
          aria-label="Toggle theme"
        >
          <ThemeIcon className="h-4 w-4" />
        </button>
      </div>
    </header>
  )
}
