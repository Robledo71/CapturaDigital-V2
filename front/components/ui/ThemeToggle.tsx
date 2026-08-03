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
        className="flex h-9 w-9 items-center justify-center rounded-lg text-blue-600 hover:bg-blue-100 dark:text-slate-400 dark:hover:bg-[#1a2d4d] transition-colors"
        aria-label="Toggle theme"
      >
        <div className="w-[18px] h-[18px]" />
      </button>
    )
  }

  const isDark =
    theme === 'dark' || (theme === 'system' && systemTheme === 'dark')

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="flex h-9 w-9 items-center justify-center rounded-lg text-blue-600 hover:bg-blue-100 hover:text-blue-800 dark:text-slate-400 dark:hover:bg-[#1a2d4d] dark:hover:text-white transition-colors"
      aria-label="Toggle theme"
    >
      {isDark ? (
        <Sun size={18} />
      ) : (
        <Moon size={18} />
      )}
    </button>
  )
}
