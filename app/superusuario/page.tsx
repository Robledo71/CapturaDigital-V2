import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  Gauge,
  TrendingUp,
  LayoutGrid,
  ClipboardList,
  FileText,
  Download,
  Unlock,
  Headset,
  Users,
  Building2,
  MapPin,
  ShieldCheck,
  History,
} from 'lucide-react'
import { getSession } from '@/back/services/session'

interface ModuleCard {
  label: string
  description: string
  href: string
  icon: React.ReactNode
}

interface ModuleGroup {
  heading: string
  cards: ModuleCard[]
}

const GROUPS: ModuleGroup[] = [
  {
    heading: 'Dashboards',
    cards: [
      { label: 'Dashboard Supervisor', description: 'KPIs y producción en vivo por planta.', href: '/superusuario/dashboard-supervisor', icon: <Gauge size={20} /> },
      { label: 'Dashboard Gerente', description: 'Vista global de calidad y piezas.', href: '/superusuario/dashboard-gerente', icon: <TrendingUp size={20} /> },
      { label: 'Dashboard Admin', description: 'Resumen administrativo del sistema.', href: '/superusuario/dashboard-admin', icon: <LayoutGrid size={20} /> },
    ],
  },
  {
    heading: 'Operación',
    cards: [
      { label: 'Carga de trabajo', description: 'Asignación de órdenes a inspectores.', href: '/superusuario/carga-trabajo', icon: <ClipboardList size={20} /> },
      { label: 'Reportes', description: 'Bandeja de reportes y su flujo.', href: '/superusuario/reportes', icon: <FileText size={20} /> },
    ],
  },
  {
    heading: 'Capturación',
    cards: [
      { label: 'Descargas', description: 'Reportes disponibles para descargar.', href: '/superusuario/descargas', icon: <Download size={20} /> },
      { label: 'Desbloquear cotizaciones', description: 'Bloqueo/desbloqueo de cotizaciones.', href: '/superusuario/desbloquear', icon: <Unlock size={20} /> },
    ],
  },
  {
    heading: 'Servicio al Cliente',
    cards: [
      { label: 'Portal Servicio', description: 'Órdenes y reportes para el cliente.', href: '/superusuario/servicio', icon: <Headset size={20} /> },
    ],
  },
  {
    heading: 'Administración',
    cards: [
      { label: 'Usuarios', description: 'Gestión de usuarios y roles.', href: '/superusuario/usuarios', icon: <Users size={20} /> },
      { label: 'Clientes', description: 'Catálogo de clientes.', href: '/superusuario/clientes', icon: <Building2 size={20} /> },
      { label: 'Plantas', description: 'Catálogo de plantas.', href: '/superusuario/plantas', icon: <MapPin size={20} /> },
      { label: 'Permisos', description: 'Matriz de permisos por rol.', href: '/superusuario/permisos', icon: <ShieldCheck size={20} /> },
    ],
  },
  {
    heading: 'Auditoría',
    cards: [
      { label: 'Historial de cambios', description: 'Registro de ediciones de reportes.', href: '/superusuario/historial', icon: <History size={20} /> },
    ],
  },
]

export default async function SuperusuarioPage() {
  const session = await getSession()
  if (!session) redirect('/')

  const firstName = session.nombreCompleto?.split(' ')[0] ?? ''

  return (
    <div className="flex flex-col flex-1 overflow-y-auto">
      {/* Header */}
      <header className="h-12 flex items-center px-4 lg:px-6 pl-12 border-b border-slate-200 dark:border-[#1a2d4d] bg-[#F5F5F7] dark:bg-[#070E1A] flex-shrink-0">
        <span className="text-sm text-slate-600 dark:text-slate-300">Superusuario</span>
      </header>

      <div className="p-4 sm:p-6 flex flex-col gap-6">
        {/* Page header */}
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
            {firstName ? `Bienvenido, ${firstName}` : 'Bienvenido'}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Acceso total a todos los módulos del sistema.
          </p>
        </div>

        {/* Module groups */}
        {GROUPS.map((group) => (
          <section key={group.heading} className="flex flex-col gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500">
              {group.heading}
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.cards.map((card) => (
                <Link
                  key={card.href}
                  href={card.href}
                  className="group flex items-start gap-3 rounded-xl border border-slate-200 dark:border-[#1a2d4d] bg-white dark:bg-[#0c1829] p-4 transition-colors hover:border-blue-500/50 hover:bg-blue-50/50 dark:hover:bg-[#101f36]"
                >
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                    {card.icon}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{card.label}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{card.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
