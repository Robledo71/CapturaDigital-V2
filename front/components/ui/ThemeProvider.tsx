'use client'

import * as React from 'react'
import { ThemeProvider as NextThemesProvider } from 'next-themes'
import type { ThemeProviderProps } from 'next-themes'

// next-themes injects an inline <script> to set the theme class before
// hydration, avoiding a flash of the wrong theme. The script runs correctly
// via the server-rendered HTML, but React 19 warns about any <script>
// rendered by a component — a documented false positive for this exact case:
// https://github.com/pacocoursey/next-themes/issues/387
if (typeof window !== 'undefined') {
  const originalError = console.error
  console.error = (...args: unknown[]) => {
    if (typeof args[0] === 'string' && args[0].includes('Encountered a script tag while rendering React component')) {
      return
    }
    originalError(...args)
  }
}

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
