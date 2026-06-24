import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ClipboardList, Lock, ArrowRight } from 'lucide-react'
import { getSession } from '@/back/services/session'
import { can } from '@/front/lib/permisos'

export const metadata = { title: 'Servicio al Cliente — Captura Digital' }

interface CapabilityCard {
  title: string
  description: string
  href: string
  icon: React.ReactNode
  permiso: Parameters<typeof can>[1]
}

const CARDS: CapabilityCard[] = [
  {
    title: 'Órdenes',
    description: 'Consulta las órdenes y reportes publicados, y revisa su detalle.',
    href: '/servicio-cliente/ordenes',
    icon: <ClipboardList size={20} />,
    permiso: 'ordenes.ver',
  },
  {
    title: 'Desbloquear cotización',
    description: 'Libera cotizaciones bloqueadas para que puedan volver a usarse.',
    href: '/servicio-cliente/desbloquear',
    icon: <Lock size={20} />,
    permiso: 'cotizaciones.desbloquear',
  },
]

export default async function ServicioClientePage() {
  const session = await getSession()
  if (!session) redirect('/')

  const cards = CARDS.filter((c) => can(session, c.permiso))

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Hola, {session.nombreCompleto.split(/\s+/)[0]}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Panel de Servicio al Cliente — gestiona órdenes y cotizaciones.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group flex flex-col gap-3 rounded-xl border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] dark:border-[#1a2d4d] dark:shadow-none bg-white dark:bg-[#0f2038] p-5 hover:border-blue-300 dark:hover:border-[#2a4d7c] transition-colors"
          >
            <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-[#1a2d4d] flex items-center justify-center text-blue-600 dark:text-blue-400">
              {card.icon}
            </div>
            <div className="flex-1">
              <p className="text-base font-semibold text-slate-900 dark:text-white">{card.title}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{card.description}</p>
            </div>
            <span className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 dark:text-blue-400">
              Abrir
              <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
