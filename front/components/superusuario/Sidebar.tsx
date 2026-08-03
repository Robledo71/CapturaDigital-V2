'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logoutUser } from '@/app/actions/logout'
import {
  LayoutDashboard,
  Gauge,
  TrendingUp,
  LayoutGrid,
  ClipboardList,
  ClipboardCheck,
  FileStack,
  FileText,
  Download,
  Unlock,
  Headset,
  Users,
  Building2,
  MapPin,
  ShieldCheck,
  History,
  HardHat,
  PenLine,
  ChevronDown,
  Menu,
  X,
} from 'lucide-react'
import { can, canAny, type Permiso, type SessionLike } from '@/front/lib/permisos'

interface NavItem {
  label: string
  icon: React.ReactNode
  href: string
  exact?: boolean
  /** Permiso requerido para ver el link. Si se omite, siempre visible. */
  permiso?: Permiso
  /** Alternativa a `permiso`: visible si el usuario tiene AL MENOS uno de estos. */
  permisoAny?: Permiso[]
}

interface NavSection {
  heading: string
  items: NavItem[]
}

const NAV_SECTIONS: NavSection[] = [
  {
    heading: 'VISIÓN GENERAL',
    items: [
      { label: 'Inicio', icon: <LayoutDashboard size={16} />, href: '/superusuario', exact: true },
    ],
  },
  {
    heading: 'DASHBOARDS',
    items: [
      { label: 'Dashboard Supervisor', icon: <Gauge size={16} />, href: '/superusuario/dashboard-supervisor', exact: true, permiso: 'supervisor.ver' },
      { label: 'Dashboard Gerente', icon: <TrendingUp size={16} />, href: '/superusuario/dashboard-gerente', exact: true, permiso: 'gerente.ver' },
      { label: 'Dashboard Admin', icon: <LayoutGrid size={16} />, href: '/superusuario/dashboard-admin', exact: true, permiso: 'admin.ver' },
    ],
  },
  {
    heading: 'OPERACIÓN',
    items: [
      { label: 'Carga de trabajo', icon: <ClipboardList size={16} />, href: '/superusuario/carga-trabajo', permiso: 'ordenes.ver' },
      { label: 'Órdenes informales', icon: <FileStack size={16} />, href: '/superusuario/ordenes-informales', permiso: 'ordenes_informales.ver' },
      { label: 'Reportes informales', icon: <ClipboardCheck size={16} />, href: '/superusuario/reportes-informales' },
      { label: 'Reportes', icon: <FileText size={16} />, href: '/superusuario/reportes', permiso: 'reportes.ver' },
    ],
  },
  {
    heading: 'CAPTURACIÓN',
    items: [
      { label: 'Descargas', icon: <Download size={16} />, href: '/superusuario/descargas', permiso: 'ordenes.descargar' },
      { label: 'Desbloquear cotizaciones', icon: <Unlock size={16} />, href: '/superusuario/desbloquear', permiso: 'cotizaciones.desbloquear' },
    ],
  },
  {
    heading: 'SERVICIO AL CLIENTE',
    items: [
      { label: 'Portal Servicio', icon: <Headset size={16} />, href: '/superusuario/servicio', exact: true, permiso: 'servicio_cliente.ver' },
    ],
  },
  {
    heading: 'ADMINISTRACIÓN',
    items: [
      { label: 'Usuarios', icon: <Users size={16} />, href: '/superusuario/usuarios', permiso: 'usuarios.crud' },
      { label: 'Inspectores', icon: <HardHat size={16} />, href: '/superusuario/inspectores' },
      { label: 'Clientes', icon: <Building2 size={16} />, href: '/superusuario/clientes', permiso: 'clientes.crud' },
      { label: 'Plantas', icon: <MapPin size={16} />, href: '/superusuario/plantas', permiso: 'plantas.crud' },
      { label: 'Permisos', icon: <ShieldCheck size={16} />, href: '/superusuario/permisos', permiso: 'permisos.configurar' },
    ],
  },
  {
    heading: 'AUDITORÍA',
    items: [
      { label: 'Historial de cambios', icon: <History size={16} />, href: '/superusuario/historial', permiso: 'historial.ver' },
    ],
  },
  {
    heading: 'CONFIGURACIÓN',
    items: [
      {
        label: 'Mi firma',
        icon: <PenLine size={16} />,
        href: '/superusuario/configuracion',
        permisoAny: ['reportes.firmar', 'reportes_informales.firmar'],
      },
    ],
  },
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

const ROL_LABEL: Record<string, string> = {
  superusuario: 'Superusuario',
}

export function Sidebar({ user }: SidebarProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()
  const initials = getInitials(user.nombreCompleto)
  const rolDisplay = ROL_LABEL[user.rol] ?? (user.rol.charAt(0).toUpperCase() + user.rol.slice(1))
  const session: SessionLike = { rol: user.rol, permisos: user.permisos }

  function isActive(item: NavItem): boolean {
    if (item.exact) return pathname === item.href
    return pathname === item.href || pathname.startsWith(item.href + '/')
  }

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

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
          const visibleItems = section.items.filter((item) => {
            if (item.permisoAny) return canAny(session, item.permisoAny)
            return !item.permiso || can(session, item.permiso)
          })
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
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">{initials}</span>
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-slate-900 dark:text-white text-sm font-medium leading-tight truncate">{user.nombreCompleto}</p>
            <p className="text-slate-600 dark:text-slate-400 text-xs leading-tight mt-0.5 truncate">{rolDisplay}</p>
          </div>
          <ChevronDown
            size={14}
            className={`flex-shrink-0 text-slate-600 dark:text-slate-400 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}
          />
        </button>

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
      {/* Hamburger — mobile only */}
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

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-52 flex-shrink-0 flex-col border-r border-white dark:border-[#0c1829] bg-white dark:bg-[#0c1829]">
        {sidebarContent}
      </aside>
    </>
  )
}
