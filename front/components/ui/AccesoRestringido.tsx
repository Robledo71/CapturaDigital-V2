import { ShieldAlert } from 'lucide-react'

interface AccesoRestringidoProps {
  titulo?: string
  mensaje?: string
}

export function AccesoRestringido({
  titulo = 'Acceso restringido',
  mensaje = 'No tienes permiso para ver esta información.',
}: AccesoRestringidoProps) {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0c1829] px-8 py-10 text-center max-w-md w-full">
        <div className="mb-5 flex justify-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 dark:bg-[#1a2d4d]">
            <ShieldAlert size={28} className="text-slate-500 dark:text-slate-400" aria-hidden="true" />
          </span>
        </div>
        <h2 className="mb-2 text-base font-semibold text-slate-800 dark:text-slate-100">
          {titulo}
        </h2>
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          {mensaje}
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Si crees que es un error, contacta a tu administrador.
        </p>
      </div>
    </div>
  )
}
