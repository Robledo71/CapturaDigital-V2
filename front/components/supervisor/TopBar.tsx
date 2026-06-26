import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { ThemeToggle } from '@/front/components/ui/ThemeToggle'
import { NotificationsBell } from '@/front/components/supervisor/NotificationsBell'

interface TopBarProps {
  crumb?: string
}

export function TopBar({ crumb }: TopBarProps) {
  return (
    <header className="h-12 pl-12 pr-4 lg:px-6 flex items-center justify-between flex-shrink-0 bg-[#F5F5F7] dark:bg-[#070E1A] border-b border-[#F5F5F7] dark:border-[#070E1A]">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm">
        <Link
          href="/supervisor"
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
      </div>
    </header>
  )
}
