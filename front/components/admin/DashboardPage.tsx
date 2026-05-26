import Link from 'next/link'
import { Users, Building2, MapPin, Tablet, Plus, FileText, Activity } from 'lucide-react'
import type { AdminDashboardStats, AdminRecentUsuario } from '@/back/services/adminDashboardService'

// ─── Types ────────────────────────────────────────────────────────────────────

type UserRol = 'admin' | 'supervisor' | 'capturacion' | 'lider'

// ─── Sub-components ────────────────────────────────────────────────────────────

interface AdminStatCardProps {
  label: string
  value: string
  subtitle: string
  dotColor: 'purple' | 'blue' | 'green' | 'yellow' | 'red'
  icon: React.ReactNode
}

function AdminStatCard({ label, value, subtitle, dotColor, icon }: AdminStatCardProps) {
  const dotClasses: Record<AdminStatCardProps['dotColor'], string> = {
    purple: 'bg-purple-400',
    blue:   'bg-blue-400',
    green:  'bg-green-400',
    yellow: 'bg-yellow-400',
    red:    'bg-red-400',
  }
  return (
    <div className="rounded-xl border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] dark:border-[#1a2d4d] dark:shadow-none bg-white dark:bg-[#0c1829] p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotClasses[dotColor]}`} aria-hidden="true" />
          <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
        </div>
        <span className="text-slate-600" aria-hidden="true">{icon}</span>
      </div>
      <p className="text-3xl font-bold text-slate-900 dark:text-white leading-none">{value}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
    </div>
  )
}

interface QuickActionProps {
  label: string
  href: string
  icon: React.ReactNode
}

function QuickAction({ label, href, icon }: QuickActionProps) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center justify-center gap-3 rounded-xl border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] dark:border-[#1a2d4d] dark:shadow-none bg-white dark:bg-[#0c1829] hover:bg-blue-50 dark:hover:bg-[#1a2d4d] transition-colors p-6 text-center"
    >
      <span className="text-slate-500 dark:text-slate-400">{icon}</span>
      <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">{label}</span>
    </Link>
  )
}

function RolBadge({ rol }: { rol: UserRol }) {
  if (rol === 'admin') {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 border border-purple-300 dark:bg-purple-500/10 dark:text-purple-300 dark:border-purple-500/20">
        Administrador
      </span>
    )
  }
  if (rol === 'supervisor') {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-300 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20">
        Supervisor
      </span>
    )
  }
  if (rol === 'lider') {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 border border-yellow-300 dark:bg-yellow-500/10 dark:text-yellow-300 dark:border-yellow-500/20">
        Líder
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-violet-100 text-violet-700 border border-violet-300 dark:bg-violet-500/10 dark:text-violet-300 dark:border-violet-500/20">
      Capturación
    </span>
  )
}

function EstadoBadge({ isActive }: { isActive: boolean }) {
  if (isActive) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-300">
        <span className="w-1.5 h-1.5 rounded-full bg-green-600 dark:bg-green-400" aria-hidden="true" />
        Activo
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400">
      <span className="w-1.5 h-1.5 rounded-full bg-slate-500" aria-hidden="true" />
      Inactivo
    </span>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface DashboardPageProps {
  stats: AdminDashboardStats
  recentUsuarios: AdminRecentUsuario[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildUsuariosSubtitle(desglose: AdminDashboardStats['desglosePorRol']): string {
  const parts: string[] = []
  if (desglose.supervisor > 0) parts.push(`${desglose.supervisor} supervisor${desglose.supervisor !== 1 ? 'es' : ''}`)
  if (desglose.admin > 0) parts.push(`${desglose.admin} admin${desglose.admin !== 1 ? 's' : ''}`)
  if (desglose.lider > 0) parts.push(`${desglose.lider} líder${desglose.lider !== 1 ? 'es' : ''}`)
  if (desglose.capturacion > 0) parts.push(`${desglose.capturacion} capturación`)
  return parts.length > 0 ? parts.join(' · ') : 'sin usuarios activos'
}

// ─── Main component ────────────────────────────────────────────────────────────

export function DashboardPage({ stats, recentUsuarios }: DashboardPageProps) {
  const today = new Date().toLocaleDateString('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const tabletsOffline = stats.tabletsRegistradas - stats.tabletsActivas
  const tabletsSubtitle =
    tabletsOffline === 0
      ? 'todos los dispositivos en línea'
      : `${tabletsOffline} dispositivo${tabletsOffline !== 1 ? 's' : ''} offline`

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">

      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Bienvenido, Administrador</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Sistema de administración · Quality Bolca</p>
        </div>
        <p className="text-sm text-slate-500 whitespace-nowrap capitalize">{today}</p>
      </div>

      {/* KPI grid — 3 × 2 */}
      <div className="grid grid-cols-3 gap-4">
        <AdminStatCard
          label="Usuarios activos"
          value={String(stats.usuariosActivos)}
          subtitle={buildUsuariosSubtitle(stats.desglosePorRol)}
          dotColor="purple"
          icon={<Users size={18} />}
        />
        <AdminStatCard
          label="Clientes"
          value={String(stats.totalClientes)}
          subtitle="registrados"
          dotColor="blue"
          icon={<Building2 size={18} />}
        />
        <AdminStatCard
          label="Plantas activas"
          value={String(stats.plantasActivas)}
          subtitle="con operación"
          dotColor="green"
          icon={<MapPin size={18} />}
        />
        <AdminStatCard
          label="Tablets registradas"
          value={String(stats.tabletsRegistradas)}
          subtitle="inventario total"
          dotColor="blue"
          icon={<Tablet size={18} />}
        />
        <AdminStatCard
          label="Reportes pendientes hoy"
          value={String(stats.reportesPendientes)}
          subtitle="pendientes de envío al cliente"
          dotColor="yellow"
          icon={<FileText size={18} />}
        />
        <AdminStatCard
          label="Tablets activas / total"
          value={`${stats.tabletsActivas} / ${stats.tabletsRegistradas}`}
          subtitle={tabletsSubtitle}
          dotColor="green"
          icon={<Activity size={18} />}
        />
      </div>

      {/* Quick actions */}
      <section aria-labelledby="acciones-heading">
        <h2 id="acciones-heading" className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
          Acciones rápidas
        </h2>
        <div className="grid grid-cols-4 gap-4">
          <QuickAction
            label="Nuevo usuario"
            href="/admin/usuarios"
            icon={<Plus size={28} />}
          />
          <QuickAction
            label="Nuevo cliente"
            href="/admin/clientes"
            icon={<Plus size={28} />}
          />
          <QuickAction
            label="Nueva planta"
            href="/admin/plantas"
            icon={<Plus size={28} />}
          />
          <QuickAction
            label="Registrar tablet"
            href="/admin/tablets"
            icon={<Plus size={28} />}
          />
        </div>
      </section>

      {/* Recent users table */}
      <section aria-labelledby="usuarios-heading">
        <div className="flex items-center justify-between mb-3">
          <h2 id="usuarios-heading" className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Usuarios recientes
          </h2>
          <Link
            href="/admin/usuarios"
            className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
          >
            Ver todos →
          </Link>
        </div>

        <div className="rounded-xl border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] dark:border-[#1a2d4d] dark:shadow-none bg-white dark:bg-[#0c1829] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" aria-label="Usuarios recientes">
              <thead>
                <tr className="border-b border-blue-200 dark:border-[#1a2d4d]">
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                    Nombre
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                    Código
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                    Rol
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                    Planta
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a2d4d]">
                {recentUsuarios.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-slate-500 text-sm">
                      No hay usuarios registrados aún.
                    </td>
                  </tr>
                ) : (
                  recentUsuarios.map((user) => (
                    <tr key={user.id} className="hover:bg-blue-50 dark:hover:bg-[#1a2d4d]/40 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0" aria-hidden="true">
                            <span className="text-white text-xs font-bold">
                              {user.nombreCompleto.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                            </span>
                          </div>
                          <span className="text-slate-900 dark:text-slate-200 font-medium">{user.nombreCompleto}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-500 dark:text-slate-400 text-xs whitespace-nowrap">
                        {user.codigoEmpleado}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <RolBadge rol={user.rol as UserRol} />
                      </td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-sm whitespace-nowrap">
                        {user.plant?.name ?? '—'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <EstadoBadge isActive={user.isActive} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

    </div>
  )
}
