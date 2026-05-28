'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logoutUser } from '@/app/actions/logout'
import {
  FileText,
  Download,
  ChevronDown,
  Lock,
} from 'lucide-react'

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
}

const NAV_SECTIONS: { heading: string; items: NavItem[] }[] = [
  {
    heading: 'REPORTES',
    items: [
      {
        label: 'Publicados',
        href: '/capturacion',
        icon: <FileText size={16} />,
      },
      {
        label: 'Mis descargas',
        href: '/capturacion/descargas',
        icon: <Download size={16} />,
      },
      {
        label: 'Desbloquear Cotización',
        href: '/capturacion/desbloquear',
        icon: <Lock size={16} />,
      }
    ],
  },
]

interface SidebarProps {
  user: {
    nombreCompleto: string
    rol: string
  }
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}

const ROL_LABEL: Record<string, string> = {
  admin:       'Acceso total',
  supervisor:  'Supervisor',
  lider:       'Líder',
  capturacion: 'Capturación',
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const [dropdownOpen, setDropdownOpen] = useState(false)

  return (
    <aside className="w-52 flex-shrink-0 border-r border-[#2d4f7c] dark:border-[#1a2d4d] bg-[#1e3a5f] dark:bg-[#0c1829] flex flex-col">
      {/* Brand header */}
      <div className="px-4 py-5 flex items-center gap-3 border-b border-[#2d4f7c] dark:border-[#1a2d4d]">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-sm">C</span>
        </div>
        <div className="min-w-0">
          <p className="text-white dark:text-white font-bold text-sm leading-tight truncate">Captura Digital</p>
          <p className="text-[#64748b] text-xs leading-tight mt-0.5">Portal de capturación</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-5">
        {NAV_SECTIONS.map((section) => (
          <div key={section.heading} className="flex flex-col gap-1">
            <p className="text-xs text-blue-300 dark:text-slate-500 font-semibold tracking-wider uppercase px-3 mb-1">
              {section.heading}
            </p>
            {section.items.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={
                    isActive
                      ? 'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-white dark:text-white bg-white/15 dark:bg-[#1a3a5c] w-full text-left'
                      : 'flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-blue-200 dark:text-slate-400 hover:bg-white/10 dark:hover:bg-[#1a2d4d] hover:text-white dark:hover:text-white transition-colors w-full text-left'
                  }
                >
                  <span className="flex-shrink-0">{item.icon}</span>
                  <span className="flex-1 truncate">{item.label}</span>
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Session section */}
      <div className="px-3 pb-4 border-t border-[#2d4f7c] dark:border-[#1a2d4d] pt-4 relative">
        <p className="text-xs text-blue-300 dark:text-slate-500 font-semibold tracking-wider uppercase px-3 mb-2">
          SESIÓN ACTIVA
        </p>

        <button
          type="button"
          onClick={() => setDropdownOpen((prev) => !prev)}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-white/10 dark:hover:bg-[#1a2d4d] transition-colors"
          aria-haspopup="menu"
          aria-expanded={dropdownOpen}
        >
          {/* Avatar */}
          <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">{getInitials(user.nombreCompleto)}</span>
          </div>
          {/* Info */}
          <div className="flex-1 min-w-0 text-left">
            <p className="text-white dark:text-white text-sm font-medium leading-tight truncate">{user.nombreCompleto}</p>
            <p className="text-blue-300 dark:text-slate-400 text-xs leading-tight mt-0.5 truncate">{ROL_LABEL[user.rol] ?? user.rol}</p>
          </div>
          <ChevronDown
            size={14}
            className={`flex-shrink-0 text-blue-300 dark:text-slate-400 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {/* Dropdown */}
        {dropdownOpen && (
          <div
            role="menu"
            className="absolute bottom-full left-3 right-3 mb-1 rounded-lg border border-[#2d4f7c] dark:border-[#1a2d4d] bg-[#162e50] dark:bg-[#0c1829] shadow-xl overflow-hidden"
          >
            <div className="border-t border-[#2d4f7c] dark:border-[#1a2d4d]" />
            <button
              type="button"
              role="menuitem"
              className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-white/10 dark:hover:bg-[#1a2d4d] transition-colors"
              onClick={logoutUser}
            >
              Cerrar sesión
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
