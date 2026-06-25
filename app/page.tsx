import { SupervisorLoginForm } from '@/front/components/auth/SupervisorLoginForm'

export const metadata = {
  title: 'Quality Bolca — Captura Digital',
}

export default function SupervisorLoginPage() {
  return (
    <main
      className="dark fixed inset-0 overflow-y-auto"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, #0d1f3c 0%, #070e1a 70%)' }}
    >
      <div className="flex min-h-full justify-center px-4 py-8">
        <div className="mb-auto mt-[8vh] w-full max-w-sm rounded-2xl bg-[#0c1829] px-5 py-7 shadow-2xl sm:mt-[15vh] sm:px-8 sm:py-10">
          <SupervisorLoginForm />
        </div>
      </div>
    </main>
  )
}
