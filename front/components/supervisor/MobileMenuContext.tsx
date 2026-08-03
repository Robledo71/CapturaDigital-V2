'use client'

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

interface MobileMenuContextValue {
  mobileOpen: boolean
  openMobileMenu: () => void
  closeMobileMenu: () => void
}

const MobileMenuContext = createContext<MobileMenuContextValue | null>(null)

export function MobileMenuProvider({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const openMobileMenu = useCallback(() => setMobileOpen(true), [])
  const closeMobileMenu = useCallback(() => setMobileOpen(false), [])

  return (
    <MobileMenuContext.Provider value={{ mobileOpen, openMobileMenu, closeMobileMenu }}>
      {children}
    </MobileMenuContext.Provider>
  )
}

export function useMobileMenu(): MobileMenuContextValue {
  const ctx = useContext(MobileMenuContext)
  if (!ctx) throw new Error('useMobileMenu must be used within a MobileMenuProvider')
  return ctx
}
