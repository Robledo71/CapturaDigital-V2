import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { ThemeToggle } from '@/front/components/ui/ThemeToggle'

interface TopBarProps {
  crumb?: string
}

export function TopBar({ crumb }: TopBarProps) {
  return (
    <header className="h-12 px-6 flex items-center justify-between flex-shrink-0 bg-[#1e3a5f] dark:bg-[#0c1829] border-b border-blue-200 dark:border-[#1a2d4d]">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm">
        <Link
          href="/supervisor"
          className="text-slate-200 dark:text-slate-400 hover:text-slate-400 dark:hover:text-white transition-colors"
        >
          Inicio
        </Link>
        {crumb && (
          <>
            <ChevronRight size={13} className="text-slate-300 dark:text-slate-600 flex-shrink-0" />
            <span className="text-white dark:text-slate-200">{crumb}</span>
          </>
        )}
      </nav>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <ThemeToggle />
      </div>
    </header>
  )
}
