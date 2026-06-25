'use client'

import { useState } from 'react'
import { useActionState } from 'react'
import { loginSupervisor, requestPasswordReset, type LoginState, type ForgotState } from '@/app/actions/supervisor-login'
import { Input } from '@/front/components/ui/Input'
import { Button } from '@/front/components/ui/Button'
import Image from 'next/image'
import { ArrowLeft, CheckCircle } from 'lucide-react'

type View = 'login' | 'forgot'

function LoginView({ onForgot }: { onForgot: () => void }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginSupervisor, undefined)

  return (
    <>
      {/* Icon */}
      <div className="mb-4 flex justify-center sm:mb-6">
        <Image
          src="/logoCheck.png"
          alt="Quality Bolca"
          width={100}
          height={100}
          className="h-20 w-20 rounded-xl sm:h-24 sm:w-24"
          priority
        />
      </div>

      {/* Header */}
      <h1 className="mb-2 text-center text-xl font-bold text-blue-950 dark:text-white sm:text-2xl">
        Bienvenido
      </h1>
      <p className="mb-6 text-center text-sm leading-relaxed text-blue-600 dark:text-slate-400 sm:mb-8">
        Ingresa tus credenciales para acceder al panel de supervisión
      </p>

      {/* Form */}
      <form action={action} className="flex flex-col gap-4 sm:gap-5">
        {state?.errors?.general && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
            {state.errors.general.map((msg) => (
              <p key={msg} className="text-sm text-red-400">{msg}</p>
            ))}
          </div>
        )}

        <Input
          id="employee_number"
          name="employee_number"
          label="Número de empleado"
          placeholder="S-001"
          autoComplete="username"
          defaultValue={state?.employee_number}
          error={state?.errors?.employee_number?.[0]}
        />

        <div className="flex flex-col gap-1.5">
          <Input
            id="password"
            name="password"
            type="password"
            label="Contraseña"
            autoComplete="current-password"
            error={state?.errors?.password?.[0]}
          />
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onForgot}
              className="text-xs text-blue-400 transition-colors hover:text-blue-300"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>
        </div>

        <Button type="submit" pending={pending}>
          Iniciar sesión
        </Button>
      </form>
    </>
  )
}

function ForgotView({ onBack }: { onBack: () => void }) {
  const [state, action, pending] = useActionState<ForgotState, FormData>(requestPasswordReset, undefined)

  return (
    <>
      {/* Icon */}
      <div className="mb-4 flex justify-center sm:mb-6">
        <Image
          src="/logoCheck.png"
          alt="Quality Bolca"
          width={100}
          height={100}
          className="h-20 w-20 rounded-xl sm:h-24 sm:w-24"
          priority
        />
      </div>

      {/* Header */}
      <h1 className="mb-2 text-center text-xl font-bold text-blue-950 dark:text-white sm:text-2xl">
        Recuperar contraseña
      </h1>
      <p className="mb-6 text-center text-sm leading-relaxed text-blue-600 dark:text-slate-400 sm:mb-8">
        Te enviaremos las instrucciones para restablecer tu contraseña
      </p>

      {/* Success state */}
      {state?.success ? (
        <div className="flex flex-col items-center gap-5 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/15 ring-1 ring-green-500/30">
            <CheckCircle size={30} className="text-green-400" />
          </div>
          <div>
            <p className="font-semibold text-blue-950 dark:text-white">Revisa tu correo</p>
            <p className="mt-1.5 text-sm leading-relaxed text-blue-600 dark:text-slate-400">
              Si el correo está registrado, recibirás las instrucciones en los próximos minutos.
            </p>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-blue-400 transition-colors hover:text-blue-300"
          >
            <ArrowLeft size={14} />
            Volver al inicio de sesión
          </button>
        </div>
      ) : (
        /* Forgot form */
        <form action={action} className="flex flex-col gap-4 sm:gap-5">
          <Input
            id="email"
            name="email"
            type="email"
            label="Correo electrónico"
            placeholder="supervisor@qualitybolca.net"
            autoComplete="email"
            error={state?.errors?.email?.[0]}
          />

          <Button type="submit" pending={pending}>
            Enviar instrucciones
          </Button>

          <button
            type="button"
            onClick={onBack}
            className="flex items-center justify-center gap-1.5 text-sm text-blue-600 dark:text-slate-400 transition-colors hover:text-blue-700 dark:text-slate-300"
          >
            <ArrowLeft size={14} />
            Volver al inicio de sesión
          </button>
        </form>
      )}
    </>
  )
}

export function SupervisorLoginForm() {
  const [view, setView] = useState<View>('login')

  return view === 'login'
    ? <LoginView onForgot={() => setView('forgot')} />
    : <ForgotView onBack={() => setView('login')} />
}
