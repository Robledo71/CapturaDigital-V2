'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logoutUser } from '@/app/actions/logout'
import {
  LayoutDashboard,
  FileText,
  ClipboardList,
  Users,
  Building2,
  MapPin,
  Tablet,
  ShieldCheck,
  ChevronDown,
  History,
  Menu,
  X,
} from 'lucide-react'

interface NavItem {
  label: string
  icon: React.ReactNode
  href: string
  badge?: string
  badgeVariant?: 'purple' | 'slate'
  exact?: boolean
}

interface NavSection {
  heading: string
  items: NavItem[]
}

const NAV_SECTIONS: NavSection[] = [
  {
    heading: 'VISIÓN GENERAL',
    items: [
      {
        label: 'Inicio',
        icon: <LayoutDashboard size={16} />,
        href: '/admin',
        exact: true,
      },
    ],
  },
  {
    heading: 'USUARIOS',
    items: [
      {
        label: 'Gestión de usuarios',
        icon: <Users size={16} />,
        href: '/admin/usuarios',
      },
    ],
  },
  {
    heading: 'CATÁLOGOS',
    items: [
      {
        label: 'Clientes',
        icon: <Building2 size={16} />,
        href: '/admin/clientes',
      },
      {
        label: 'Plantas',
        icon: <MapPin size={16} />,
        href: '/admin/plantas',
      },
      {
        label: 'Tablets',
        icon: <Tablet size={16} />,
        href: '/admin/tablets',
      },
    ],
  },
  {
    heading: 'CONFIGURACIÓN',
    items: [
      {
        label: 'Permisos',
        icon: <ShieldCheck size={16} />,
        href: '/admin/permisos',
      },
    ],
  },
  {
    heading: 'AUDITORÍA',
    items: [
      {
        label: 'Historial de cambios',
        icon: <History size={16} />,
        href: '/admin/historial',
      },
    ],
  },
]

interface SideBarProps {
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
  admin:            'Acceso total',
  supervisor:       'Supervisor',
  lider:            'Líder',
  capturacion:      'Capturación',
  servicio_cliente: 'Servicio al Cliente',
}

export function SideBar({ user }: SideBarProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()

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
      <div className="px-4 py-5 flex items-center gap-3 border-b border-[#2d4f7c] dark:border-[#1a2d4d]">
        <Image
          src="/logoCheck.png"
          alt="Quality Bolca"
          width={32}
          height={32}
          className="rounded-lg flex-shrink-0"
        />
        <div className="min-w-0">
          <p className="text-white dark:text-white font-bold text-sm leading-tight truncate">Captura Digital QB</p>
          <p className="text-[#64748b] text-xs leading-tight mt-0.5">v2 · Servicio de inspección</p>
        </div>
        {/* Close button — only visible in mobile drawer */}
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          aria-label="Cerrar menú"
          className="ml-auto lg:hidden p-1 rounded-md text-blue-300 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
        >
          <X size={16} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-5" aria-label="Menú principal">
        {NAV_SECTIONS.map((section) => (
          <div key={section.heading} className="flex flex-col gap-1">
            <p className="text-xs text-blue-300 dark:text-slate-500 font-semibold tracking-wider uppercase px-3 mb-1">
              {section.heading}
            </p>
            {section.items.map((item) => {
              const active = isActive(item)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={
                    active
                      ? 'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-white dark:text-white bg-white/15 dark:bg-[#1a3a5c]'
                      : 'flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-blue-200 dark:text-slate-400 hover:bg-white/10 dark:hover:bg-[#1a2d4d] hover:text-white dark:hover:text-white transition-colors'
                  }
                >
                  <span className="flex-shrink-0">{item.icon}</span>
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.badge && (
                    <span
                      className={
                        item.badgeVariant === 'purple'
                          ? 'ml-auto text-xs font-medium px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400'
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
          <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
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
        className="fixed top-2 left-2 z-50 flex h-9 w-9 items-center justify-center rounded-lg bg-[#1e3a5f] dark:bg-[#0c1829] border border-[#2d4f7c] dark:border-[#1a2d4d] text-white shadow-md lg:hidden"
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
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-[#1e3a5f] dark:border-[#0c1829] bg-[#1e3a5f] dark:bg-[#0c1829] transition-transform duration-300 lg:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Desktop sidebar — always visible on lg+ */}
      <aside className="hidden lg:flex w-52 flex-shrink-0 flex-col border-r border-[#1e3a5f] dark:border-[#0c1829] bg-[#1e3a5f] dark:bg-[#0c1829]">
        {sidebarContent}
      </aside>
    </>
  )
}
