'use client'

import * as React from 'react'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'

export function ThemeToggle() {
  const { setTheme, theme, systemTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  // Avoid hydration mismatch
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <button
        className="p-2 rounded-md hover:bg-blue-100 dark:hover:bg-[#1a2d4d] text-blue-600 dark:text-slate-400 transition-colors"
        aria-label="Toggle theme"
      >
        <div className="w-5 h-5" />
      </button>
    )
  }

  const isDark =
    theme === 'dark' || (theme === 'system' && systemTheme === 'dark')

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="p-2 rounded-md hover:bg-blue-100 dark:hover:bg-[#1a2d4d] text-white dark:text-slate-400 hover:text-blue-900 dark:hover:text-blue-950 dark:text-white transition-colors"
      aria-label="Toggle theme"
    >
      {isDark ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
    </button>
  )
}
