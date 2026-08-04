import Link from 'next/link'
import { Users, Building2, MapPin, FileText } from 'lucide-react'
import type { AdminDashboardStats, AdminRecentUsuario } from '@/back/services/adminDashboardService'

// ─── Types ────────────────────────────────────────────────────────────────────


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
    <div className="rounded-xl border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] dark:border-[#0c1829] dark:shadow-none bg-white dark:bg-[#0c1829] p-5 flex flex-col gap-3">
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
      className="flex flex-col items-center justify-center gap-3 rounded-xl border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] dark:border-[#0c1829] dark:shadow-none bg-white dark:bg-[#0c1829] hover:bg-blue-50 dark:hover:bg-[#1a2d4d] transition-colors p-6 text-center"
    >
      <span className="text-slate-500 dark:text-slate-400">{icon}</span>
      <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">{label}</span>
    </Link>
  )
}

// Mapa de rol → etiqueta + estilo. Cubre TODOS los roles del sistema; un rol
// desconocido cae a un badge neutro con el nombre crudo capitalizado (nunca a
// "Capturación", que era el bug anterior: el default pintaba capturación para
// superusuario/supervisor_regional/gerente/inspector).
const ROL_BADGE: Record<string, { label: string; className: string }> = {
  superusuario:        { label: 'Superusuario',        className: 'bg-indigo-100 text-indigo-700 border-indigo-300 dark:bg-indigo-500/10 dark:text-indigo-300 dark:border-indigo-500/20' },
  admin:               { label: 'Administrador',       className: 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-500/10 dark:text-purple-300 dark:border-purple-500/20' },
  supervisor:          { label: 'Supervisor',          className: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20' },
  supervisor_regional: { label: 'Supervisor regional', className: 'bg-teal-100 text-teal-700 border-teal-300 dark:bg-teal-500/10 dark:text-teal-300 dark:border-teal-500/20' },
  lider:               { label: 'Líder',               className: 'bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-500/10 dark:text-yellow-300 dark:border-yellow-500/20' },
  capturacion:         { label: 'Capturación',         className: 'bg-violet-100 text-violet-700 border-violet-300 dark:bg-violet-500/10 dark:text-violet-300 dark:border-violet-500/20' },
  servicio_cliente:    { label: 'Servicio al Cliente', className: 'bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/20' },
  gerente:             { label: 'Gerente',             className: 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20' },
  inspector:           { label: 'Inspector',           className: 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20' },
  cliente:             { label: 'Cliente',             className: 'bg-cyan-100 text-cyan-700 border-cyan-300 dark:bg-cyan-500/10 dark:text-cyan-300 dark:border-cyan-500/20' },
}

function RolBadge({ rol }: { rol: string }) {
  const cfg = ROL_BADGE[rol] ?? {
    label: rol ? rol.charAt(0).toUpperCase() + rol.slice(1).replace(/_/g, ' ') : '—',
    className: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-500/10 dark:text-slate-300 dark:border-slate-500/20',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.className}`}>
      {cfg.label}
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

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-6">

      {/* Page header */}
      <div className="shrink-0 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Bienvenido, Administrador</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Sistema de administración · Quality Bolca</p>
        </div>
        <p className="text-sm text-slate-500 whitespace-nowrap capitalize">{today}</p>
      </div>

      {/* KPI grid — 2 cols mobile, 4 lg (matches GerenteDashboard pattern for 4-tile rows) */}
      <div className="shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-4">
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
          label="Reportes pendientes hoy"
          value={String(stats.reportesPendientes)}
          subtitle="pendientes de envío al cliente"
          dotColor="yellow"
          icon={<FileText size={18} />}
        />
      </div>

      {/* Quick actions */}
      <section aria-labelledby="acciones-heading" className="shrink-0">
        <h2 id="acciones-heading" className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
          Acciones rápidas
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <QuickAction
            label="Nuevo usuario"
            href="/admin/usuarios"
            icon={<Users size={28} />}
          />
          <QuickAction
            label="Nuevo cliente"
            href="/admin/clientes"
            icon={<Building2 size={28} />}
          />
          <QuickAction
            label="Nueva planta"
            href="/admin/plantas"
            icon={<MapPin size={28} />}
          />
        </div>
      </section>

      {/* Recent users table */}
      <section aria-labelledby="usuarios-heading" className="shrink-0">
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

        <div className="rounded-xl border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] dark:border-[#0c1829] dark:shadow-none bg-white dark:bg-[#0c1829] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" aria-label="Usuarios recientes">
              <thead>
                <tr className="border-b border-slate-100 dark:border-[#1a2d4d]">
                  <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-black dark:text-white uppercase tracking-wider whitespace-nowrap">
                    Nombre
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-black dark:text-white uppercase tracking-wider whitespace-nowrap">
                    Código
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-black dark:text-white uppercase tracking-wider whitespace-nowrap">
                    Rol
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-black dark:text-white uppercase tracking-wider whitespace-nowrap">
                    Planta
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-black dark:text-white uppercase tracking-wider whitespace-nowrap">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#1a2d4d]">
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
                          <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0" aria-hidden="true">
                            <span className="text-slate-700 dark:text-white text-xs font-bold">
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
                        <RolBadge rol={user.rol} />
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
