'use client'

import { useState } from 'react'
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
  ChevronDown,
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
]

export function SideBar() {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const pathname = usePathname()

  function isActive(item: NavItem): boolean {
    if (item.exact) return pathname === item.href
    return pathname === item.href || pathname.startsWith(item.href + '/')
  }

  return (
    <aside className="w-52 flex-shrink-0 border-r border-blue-200 dark:border-[#1a2d4d] bg-white dark:bg-[#0c1829] flex flex-col">
      {/* Brand header */}
      <div className="px-4 py-5 flex items-center gap-3 border-b border-blue-200 dark:border-[#1a2d4d]">
        <Image
          src="/logoCheck.png"
          alt="Quality Bolca"
          width={32}
          height={32}
          className="rounded-lg flex-shrink-0"
        />
        <div className="min-w-0">
          <p className="text-blue-950 dark:text-white font-bold text-sm leading-tight truncate">Captura Digital QB</p>
          <p className="text-[#64748b] text-xs leading-tight mt-0.5">v2 · Servicio de inspección</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-5" aria-label="Menú principal">
        {NAV_SECTIONS.map((section) => (
          <div key={section.heading} className="flex flex-col gap-1">
            <p className="text-xs text-slate-500 font-semibold tracking-wider uppercase px-3 mb-1">
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
                      ? 'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-blue-950 dark:text-white bg-[#2d1a5c]'
                      : 'flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-blue-600 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-[#1a2d4d] hover:text-blue-950 dark:text-white transition-colors'
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
      <div className="px-3 pb-4 border-t border-blue-200 dark:border-[#1a2d4d] pt-4 relative">
        <p className="text-xs text-slate-500 font-semibold tracking-wider uppercase px-3 mb-2">
          SESIÓN ACTIVA
        </p>

        <button
          type="button"
          onClick={() => setDropdownOpen((prev) => !prev)}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-blue-50 dark:hover:bg-[#1a2d4d] transition-colors"
          aria-haspopup="menu"
          aria-expanded={dropdownOpen}
        >
          {/* Avatar */}
          <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
            <span className="text-blue-950 dark:text-white text-xs font-bold">AD</span>
          </div>
          {/* Info */}
          <div className="flex-1 min-w-0 text-left">
            <p className="text-blue-950 dark:text-white text-sm font-medium leading-tight truncate">Administrador</p>
            <p className="text-blue-600 dark:text-slate-400 text-xs leading-tight mt-0.5 truncate">Acceso total</p>
          </div>
          <ChevronDown
            size={14}
            className={`flex-shrink-0 text-blue-600 dark:text-slate-400 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {/* Dropdown */}
        {dropdownOpen && (
          <div
            role="menu"
            className="absolute bottom-full left-3 right-3 mb-1 rounded-lg border border-blue-200 dark:border-[#1a2d4d] bg-white dark:bg-[#0c1829] shadow-xl overflow-hidden"
          >
            <div className="border-t border-blue-200 dark:border-[#1a2d4d]" />
            <button
              type="button"
              role="menuitem"
              className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-blue-50 dark:hover:bg-[#1a2d4d] transition-colors"
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
