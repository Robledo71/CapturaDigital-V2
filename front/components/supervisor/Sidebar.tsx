'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logoutUser } from '@/app/actions/logout'
import {
  LayoutDashboard,
  FileText,
  Menu,
  Tablet,
  ChevronDown,
  UserCheck,
  History,
  X,
} from 'lucide-react'
import { can, type Permiso, type SessionLike } from '@/front/lib/permisos'

interface NavItem {
  label: string
  icon: React.ReactNode
  href: string
  badge?: string
  badgeVariant?: 'blue' | 'slate'
  /** exact: true → activo solo si pathname === href; false → activo si pathname empieza con href */
  exact?: boolean
  /** Permiso requerido para ver el link. Si se omite, siempre visible. */
  permiso?: Permiso
}

interface NavSection {
  heading: string
  items: NavItem[]
}

const NAV_SECTIONS: NavSection[] = [
  {
    heading: 'OPERACIÓN',
    items: [
      {
        label: 'Inicio',
        icon: <LayoutDashboard size={16} />,
        href: '/supervisor',
        badge: '',
        badgeVariant: 'blue',
        exact: true,
      },
      {
        label: 'Reportes',
        icon: <FileText size={16} />,
        href: '/supervisor/reportes',
        badge: '',
        badgeVariant: 'slate',
        permiso: 'reportes.ver',
      },
      {
        label: 'Carga de trabajo',
        icon: <UserCheck size={16} />,
        href: '/supervisor/carga-trabajo',
        permiso: 'ordenes.ver',
      },
      {
        label: 'Tablets',
        icon: <Tablet size={16} />,
        href: '/supervisor/tablets',
        permiso: 'tablets.ver',
      },
      {
        label: 'Historial de cambios',
        icon: <History size={16} />,
        href: '/supervisor/historial',
        permiso: 'historial.ver',
      },
    ],
  }
]

interface SidebarProps {
  user: {
    nombreCompleto: string
    rol: string
    permisos?: string[] | null
  }
}

function getInitials(nombreCompleto: string | undefined): string {
  if (!nombreCompleto) return '?'
  return nombreCompleto
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join('')
    .toUpperCase()
}

export function Sidebar({ user }: SidebarProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()
  const initials = getInitials(user.nombreCompleto)
  const rolDisplay = user.rol.charAt(0).toUpperCase() + user.rol.slice(1)
  const session: SessionLike = { rol: user.rol, permisos: user.permisos }

  function isActive(item: NavItem): boolean {
    if (item.exact) return pathname === item.href
    return pathname === item.href || pathname.startsWith(item.href + '/')
  }

  // Close drawer on route change (navigation)
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  // Close drawer on Escape key
  useEffect(() => {
    if (!mobileOpen) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMobileOpen(false)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [mobileOpen])

  const sidebarContent = (
    <>
      {/* Brand header */}
      <div className="px-4 py-5 flex items-center gap-3 border-b border-slate-200 dark:border-[#1a2d4d]">
        <Image
          src="/logoCheck.png"
          alt="Quality Bolca"
          width={32}
          height={32}
          className="rounded-lg flex-shrink-0"
        />
        <div className="min-w-0">
          <p className="text-slate-900 dark:text-white font-bold text-sm leading-tight truncate">Captura Digital QB</p>
          <p className="text-[#64748b] text-xs leading-tight mt-0.5">v2 · Servicio de inspección</p>
        </div>
        {/* Close button — only visible in mobile drawer */}
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          aria-label="Cerrar menú"
          className="ml-auto lg:hidden p-1 rounded-md text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors flex-shrink-0"
        >
          <X size={16} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-5" aria-label="Menú principal">
        {NAV_SECTIONS.map((section) => {
          const visibleItems = section.items.filter(
            (item) => !item.permiso || can(session, item.permiso),
          )
          if (visibleItems.length === 0) return null
          return (
          <div key={section.heading} className="flex flex-col gap-1">
            <p className="text-xs text-slate-500 dark:text-slate-500 font-semibold tracking-wider uppercase px-3 mb-1">
              {section.heading}
            </p>
            {visibleItems.map((item) => {
              const active = isActive(item)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={
                    active
                      ? 'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-900 dark:text-white bg-slate-100 dark:bg-[#1a3a5c]'
                      : 'flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#1a2d4d] hover:text-slate-900 dark:hover:text-white transition-colors'
                  }
                >
                  <span className="flex-shrink-0">{item.icon}</span>
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.badge && (
                    <span
                      className={
                        item.badgeVariant === 'blue'
                          ? 'ml-auto text-xs font-medium px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400'
                          : 'ml-auto text-xs font-medium px-1.5 py-0.5 rounded-full bg-slate-500/20 text-blue-600 dark:text-slate-400'
                      }
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
          )
        })}
      </nav>

      {/* Session section */}
      <div className="px-3 pb-4 border-t border-slate-200 dark:border-[#1a2d4d] pt-4 relative">
        <p className="text-xs text-slate-500 dark:text-slate-500 font-semibold tracking-wider uppercase px-3 mb-2">
          SESIÓN ACTIVA
        </p>

        <button
          type="button"
          onClick={() => setDropdownOpen((prev) => !prev)}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-[#1a2d4d] transition-colors"
          aria-haspopup="menu"
          aria-expanded={dropdownOpen}
        >
          {/* Avatar */}
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">{initials}</span>
          </div>
          {/* Info */}
          <div className="flex-1 min-w-0 text-left">
            <p className="text-slate-900 dark:text-white text-sm font-medium leading-tight truncate">{user.nombreCompleto}</p>
            <p className="text-slate-600 dark:text-slate-400 text-xs leading-tight mt-0.5 truncate">{rolDisplay}</p>
          </div>
          <ChevronDown
            size={14}
            className={`flex-shrink-0 text-slate-600 dark:text-slate-400 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {/* Dropdown */}
        {dropdownOpen && (
          <div
            role="menu"
            className="absolute bottom-full left-3 right-3 mb-1 rounded-lg border border-slate-200 dark:border-[#1a2d4d] bg-white dark:bg-[#0c1829] shadow-xl overflow-hidden"
          >
            <div className="border-t border-slate-200 dark:border-[#1a2d4d]" />
            <button
              type="button"
              role="menuitem"
              className="w-full text-left px-4 py-2.5 text-sm text-red-500 dark:text-red-400 hover:bg-slate-100 dark:hover:bg-[#1a2d4d] transition-colors"
              onClick={logoutUser}
            >
              Cerrar sesión
            </button>
          </div>
        )}
      </div>
    </>
  )

  return (
    <>
      {/* Hamburger button — only visible on mobile (<lg) */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label="Abrir menú"
        aria-expanded={mobileOpen}
        className="fixed top-2 left-2 z-50 flex h-9 w-9 items-center justify-center rounded-lg bg-white dark:bg-[#0c1829] border border-slate-200 dark:border-[#1a2d4d] text-slate-700 dark:text-white shadow-md lg:hidden"
      >
        <Menu size={18} />
      </button>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        aria-label="Navegación principal"
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-white dark:border-[#0c1829] bg-white dark:bg-[#0c1829] transition-transform duration-300 lg:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Desktop sidebar — always visible on lg+ */}
      <aside className="hidden lg:flex w-52 flex-shrink-0 flex-col border-r border-white dark:border-[#0c1829] bg-white dark:bg-[#0c1829]">
        {sidebarContent}
      </aside>
    </>
  )
}
