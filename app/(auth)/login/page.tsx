import { SupervisorLoginForm } from '@/front/components/auth/SupervisorLoginForm'

export const metadata = {
  title: 'Login — Captura Digital',
}

export default function LoginPage() {
  return (
    <main
      className="dark fixed inset-0 overflow-y-auto"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, #0d1f3c 0%, #070e1a 70%)' }}
    >
      <div className="flex min-h-full items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm rounded-2xl border border-[#1a2d4d] bg-[#0c1829] px-4 py-8 sm:px-8 sm:py-10 shadow-2xl">
          <SupervisorLoginForm />
        </div>
      </div>
    </main>
  )
}
