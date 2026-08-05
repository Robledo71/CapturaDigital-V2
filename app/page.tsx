import { SupervisorLoginForm } from '@/front/components/auth/SupervisorLoginForm'

// Set this to a local public asset, for example: '/images/login-background.jpg'.
const LOGIN_VISUAL_IMAGE = '/login-background.webp'

export const metadata = {
  title: 'Quality Bolca — Captura Digital',
}

export default function SupervisorLoginPage() {
  return (
    <main className="dark relative h-screen overflow-hidden bg-slate-50 p-4 sm:p-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 -top-24 h-112 w-md rounded-full bg-sky-300/40 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 -right-24 h-128 w-lg rounded-full bg-blue-400/30 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/3 h-96 w-96 -translate-x-1/2 rounded-full bg-indigo-200/30 blur-3xl"
      />

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-2rem)] max-w-7xl items-center sm:min-h-[calc(100vh-4rem)]">
        <section className="mx-auto grid w-full max-w-md items-stretch overflow-hidden rounded-[1.75rem] border border-white/60 shadow-[0_24px_70px_rgba(2,25,40,0.18)] backdrop-blur-2xl lg:max-w-none lg:grid-cols-[minmax(24rem,0.85fr)_minmax(22rem,1fr)]">
          <div className="flex min-h-140 w-full items-center justify-center bg-white/50 px-7 py-12 backdrop-blur-2xl sm:px-12 lg:min-h-156 lg:px-16">
            <div className="w-full max-w-sm">
              <SupervisorLoginForm />
            </div>
          </div>

          <div
            className="relative hidden min-h-140 bg-cover bg-center lg:flex lg:min-h-156 lg:items-end"
            style={LOGIN_VISUAL_IMAGE ? { backgroundImage: `url(${LOGIN_VISUAL_IMAGE})` } : undefined}
          >
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-linear-to-t from-slate-950/85 via-blue-900/25 to-sky-400/10"
            />
            <div aria-hidden="true" className="absolute inset-0 bg-blue-500/20 mix-blend-multiply" />
            <div className="relative p-10 text-white xl:p-12">
              <p className="mb-4 text-sm font-semibold uppercase tracking-[0.28em] text-white/90">
                Quality Bolca
              </p>
              <h2 className="font-serif text-4xl font-medium leading-[1.04] xl:text-5xl">
                Gestiona cada detalle con calidad.
              </h2>
              <p className="mt-6 max-w-md text-base leading-relaxed text-white/95">
                Accede a tu cuenta y mant&eacute;n el control de tu operaci&oacute;n.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
