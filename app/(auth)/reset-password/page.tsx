import { ResetPasswordForm } from '@/front/components/auth/ResetPasswordForm'
import { AlertCircle, ArrowLeft } from 'lucide-react'

export const metadata = {
  title: 'Nueva contraseña — Captura Digital',
}

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams

  return (
    <main
      className="dark fixed inset-0 overflow-y-auto"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, #0d1f3c 0%, #070e1a 70%)' }}
    >
      <div className="flex min-h-full items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm rounded-2xl border border-[#1a2d4d] bg-[#0c1829] px-4 py-8 sm:px-8 sm:py-10 shadow-2xl">
        {token ? (
          <ResetPasswordForm token={token} />
        ) : (
          <div className="flex flex-col items-center gap-5 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/15 ring-1 ring-red-500/30">
              <AlertCircle size={30} className="text-red-400" />
            </div>
            <div>
              <p className="font-semibold text-blue-950 dark:text-white">Enlace no válido</p>
              <p className="mt-1.5 text-sm leading-relaxed text-blue-600 dark:text-slate-400">
                Este enlace de restablecimiento no es válido o ha expirado.
              </p>
            </div>
            <a
              href="/"
              className="flex items-center gap-1.5 text-sm text-blue-400 transition-colors hover:text-blue-300"
            >
              <ArrowLeft size={14} />
              Volver al inicio de sesión
            </a>
          </div>
        )}
      </div>
      </div>
    </main>
  )
}
