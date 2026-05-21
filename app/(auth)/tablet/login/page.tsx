import { Info } from 'lucide-react'
import { TabletLoginForm } from '@/front/components/auth/TabletLoginForm'

const tabletCode = process.env.NEXT_PUBLIC_TABLET_CODE ?? 'TBL-01'

export const metadata = {
  title: 'Inicia tu turno — Captura Digital',
}

export default function TabletLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-blue-50/50 dark:bg-[#070e1a] px-4"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, #0d1f3c 0%, #070e1a 70%)' }}
    >
      <div className="w-full max-w-sm rounded-2xl border border-blue-200 dark:border-[#1a2d4d] bg-white dark:bg-[#0c1829] px-8 py-10 shadow-2xl">

        {/* Logo */}
        <div className="mb-6 flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-900/40">
            <span className="text-xl font-bold text-blue-950 dark:text-white">C</span>
          </div>
        </div>

        {/* Header */}
        <h1 className="mb-2 text-center text-2xl font-bold text-blue-950 dark:text-white">
          Inicia tu turno
        </h1>
        <p className="mb-8 text-center text-sm leading-relaxed text-blue-600 dark:text-slate-400">
          Identifícate para ver los reportes asignados a esta tablet
        </p>

        {/* Tab bar — single active tab */}
        <div className="mb-6 border-b border-blue-200 dark:border-[#1a2d4d]">
          <button
            type="button"
            className="flex items-center gap-1.5 border-b-2 border-blue-500 pb-2.5 text-sm font-medium text-blue-400"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
            </svg>
            Usuario
          </button>
        </div>

        {/* Login form */}
        <TabletLoginForm />

        {/* Tablet footer */}
        <div className="mt-6 flex items-center justify-center gap-1.5 text-slate-500">
          <Info size={13} />
          <span className="text-xs">Tablet vinculada a <span className="font-medium text-blue-600 dark:text-slate-400">{tabletCode}</span></span>
        </div>

      </div>
    </main>
  )
}
