'use client'

import Link from 'next/link'
import { ChevronRight, Menu } from 'lucide-react'
import { ThemeToggle } from '@/front/components/ui/ThemeToggle'
import { NotificationsBell } from '@/front/components/supervisor/NotificationsBell'
import { useMobileMenu } from '@/front/components/supervisor/MobileMenuContext'

interface TopBarProps {
  crumb?: string
  homeHref?: string
}

export function TopBar({ crumb, homeHref = '/supervisor' }: TopBarProps) {
  const { openMobileMenu } = useMobileMenu()

  return (
    <header className="h-20 px-4 lg:px-6 flex items-center justify-between flex-shrink-0 bg-white dark:bg-[#0c1829] border-b border-slate-200 dark:border-[#1a2d4d]">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm">
        <Link
          href={homeHref}
          className="text-slate-600 dark:text-slate-400 hover:text-slate-400 dark:hover:text-white transition-colors"
        >
          Inicio
        </Link>
        {crumb && (
          <>
            <ChevronRight size={13} className="text-slate-300 dark:text-slate-600 flex-shrink-0" />
            <span className="text-slate-600 dark:text-slate-200">{crumb}</span>
          </>
        )}
      </nav>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <NotificationsBell />
        <ThemeToggle />
        <button
          type="button"
          onClick={openMobileMenu}
          aria-label="Abrir menú"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-white/10 dark:hover:text-white transition-colors lg:hidden"
        >
          <Menu size={18} />
        </button>
      </div>
    </header>
  )
}
