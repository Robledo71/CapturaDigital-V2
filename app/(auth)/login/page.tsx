import { SupervisorLoginForm } from '@/front/components/auth/SupervisorLoginForm'

export const metadata = {
  title: 'Login — Captura Digital',
}

export default function LoginPage() {
  return (
    <main
      className="dark flex min-h-screen items-center justify-center px-4"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, #0d1f3c 0%, #070e1a 70%)' }}
    >
      <div className="w-full max-w-sm rounded-2xl border border-[#1a2d4d] bg-[#0c1829] px-8 py-10 shadow-2xl">
        <SupervisorLoginForm />
      </div>
    </main>
  )
}
