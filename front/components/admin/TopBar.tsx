import Link from 'next/link'
import { Bell, Settings, ChevronRight } from 'lucide-react'
import { ThemeToggle } from '@/front/components/ui/ThemeToggle'

interface TopBarProps {
  crumb?: string
}

export function TopBar({ crumb }: TopBarProps) {
  return (
    <header className="h-12 px-6 flex items-center justify-between flex-shrink-0 bg-white dark:bg-[#0c1829] border-b border-blue-200 dark:border-[#1a2d4d]">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm">
        <Link
          href="/admin"
          className="text-blue-600 dark:text-slate-400 hover:text-blue-950 dark:text-white transition-colors"
        >
          Inicio
        </Link>
        {crumb && (
          <>
            <ChevronRight size={13} className="text-slate-600 flex-shrink-0" />
            <span className="text-slate-200">{crumb}</span>
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
