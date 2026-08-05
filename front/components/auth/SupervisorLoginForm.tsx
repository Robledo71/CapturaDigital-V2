'use client'

import { useState } from 'react'
import { useActionState } from 'react'
import { loginSupervisor, requestPasswordReset, type LoginState, type ForgotState } from '@/app/actions/supervisor-login'
import { Input } from '@/front/components/ui/Input'
import { Button } from '@/front/components/ui/Button'
import Image from 'next/image'
import { ArrowLeft, CheckCircle, Copy, Check } from 'lucide-react'

type View = 'login' | 'forgot'

/**
 * Pantalla TEMPORAL: mientras no exista el destino real del login (dashboards sin
 * datos aún), al iniciar sesión con éxito se muestra la respuesta JSON del backend.
 */
function LoginSuccessView({ response }: { response: NonNullable<LoginState>['response'] }) {
  const [copied, setCopied] = useState(false)
  const json = JSON.stringify(response, null, 2)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(json)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard no disponible: no hacer nada */
    }
  }

  return (
    <>
      <div className="mb-4 flex justify-center sm:mb-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/15 ring-1 ring-green-500/30">
          <CheckCircle size={30} className="text-green-400" />
        </div>
      </div>

      <h1 className="mb-2 text-center text-xl font-bold text-blue-950 dark:text-white sm:text-2xl">
        Login exitoso
      </h1>
      <p className="mb-5 text-center text-sm leading-relaxed text-blue-600 dark:text-slate-400">
        Respuesta del backend (pantalla temporal)
      </p>

      <div className="relative">
        <button
          type="button"
          onClick={copy}
          aria-label="Copiar JSON"
          className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-md border border-slate-600/50 bg-slate-800/70 px-2 py-1 text-xs text-slate-300 transition-colors hover:border-blue-500/50 hover:text-blue-300"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? 'Copiado' : 'Copiar'}
        </button>
        <pre className="max-h-96 overflow-auto rounded-lg border border-slate-700 bg-slate-900 p-4 text-left font-mono text-xs leading-relaxed text-slate-100">
{json}
        </pre>
      </div>

      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-5 flex w-full items-center justify-center gap-1.5 text-sm text-blue-600 transition-colors hover:text-blue-700 dark:text-slate-400 dark:hover:text-slate-300"
      >
        <ArrowLeft size={14} />
        Volver al inicio de sesión
      </button>
    </>
  )
}

/**
 * Pantalla de bloqueo: cuentas de mobile (cliente/inspector) no pueden entrar a la
 * app de staff. El backend responde `wrong_app` y aquí se muestra la ilustración.
 */
/** Extrae el `message` del JSON del backend; cae a un texto por defecto si no viene. */
function extractMessage(raw: unknown): string {
  if (raw && typeof raw === 'object' && 'message' in raw) {
    const msg = (raw as { message?: unknown }).message
    if (typeof msg === 'string' && msg.trim()) return msg
  }
  return 'No puedes ingresar a esta aplicación con este tipo de cuenta.'
}

function LoginBlockedView({ onBack, raw }: { onBack: () => void; raw?: unknown }) {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-y-auto px-6 py-10 text-center"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, #0d1f3c 0%, #070e1a 70%)' }}
    >
      <Image
        src="/error.png"
        alt="Acceso no permitido"
        width={900}
        height={600}
        className="mb-6 h-auto w-full max-w-2xl"
        priority
      />
      <h1 className="mb-2 text-2xl font-bold text-white sm:text-3xl">
        Acceso no permitido
      </h1>

      <p className="mb-8 max-w-md text-sm leading-relaxed text-slate-400 sm:text-base">
        {extractMessage(raw)}
      </p>

      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-slate-400 transition-colors hover:text-slate-200"      >
        <ArrowLeft size={14} />
        Volver al inicio de sesión
      </button>
    </div>
  )
}

function LoginView({ onForgot }: { onForgot: () => void }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginSupervisor, undefined)
  const lightInputProps = {
    containerClassName: 'gap-1',
    labelClassName: 'text-xs font-semibold text-slate-700 dark:!text-slate-700',
    inputClassName: 'rounded-md border-slate-200 bg-slate-100 px-3 py-2.5 text-slate-900 placeholder:text-slate-400 hover:border-sky-300 focus:border-sky-400 focus:bg-white focus:ring-sky-400 dark:!text-slate-900',
    errorClassName: 'rounded-md border-red-400 bg-red-50 px-3 py-2.5 text-slate-900 placeholder:text-slate-400 focus:border-red-500 focus:ring-red-400 dark:!text-slate-900',
  }

  if (state?.blocked) {
    return <LoginBlockedView onBack={() => window.location.reload()} raw={state.raw} />
  }

  if (state?.response) {
    return <LoginSuccessView response={state.response} />
  }

  return (
    <>
      {/* Icon */}
      <div className="mb-5 flex justify-center">
        <Image
          src="/qbsync_logo.png"
          alt="Quality Bolca"
          width={280}
          height={280}
          className="h-auto w-56 object-contain sm:w-64"
          quality={100}
          priority
        />
      </div>

      {/* Header */}
      <h1 className="mb-1 text-center font-serif text-3xl font-medium tracking-tight text-slate-900 dark:text-slate-900 sm:text-4xl">
        Bienvenido
      </h1>
      <p className="mb-8 text-center text-xs leading-relaxed text-slate-500 dark:text-slate-500">
        Ingresa tus credenciales para acceder a tu cuenta
      </p>

      {/* Form */}
      <form action={action} className="flex flex-col gap-4">
        {state?.errors?.general && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2.5">
            {state.errors.general.map((msg) => (
              <p key={msg} className="text-sm text-red-600">{msg}</p>
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
          {...lightInputProps}
        />

        <div className="flex flex-col gap-1">
          <Input
            id="password"
            name="password"
            type="password"
            label="Contraseña"
            autoComplete="current-password"
            error={state?.errors?.password?.[0]}
            {...lightInputProps}
          />
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onForgot}
              className="text-xs font-medium text-sky-600 transition-colors hover:text-sky-700 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>
        </div>

        <Button type="submit" pending={pending} className="!mt-1 !rounded-md !bg-sky-500 !py-2.5 !text-white hover:!bg-sky-600 focus-visible:!outline-sky-500">
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
          src="/qbsync_logo.png"
          alt="Quality Bolca"
          width={280}
          height={280}
          className="h-auto w-56 rounded-xl object-contain sm:w-64"
          quality={100}
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
            className="flex items-center gap-1.5 text-sm text-blue-400 transition-colors hover:text-blue-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
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
            placeholder="usuario@qualitybolca.net"
            autoComplete="email"
            error={state?.errors?.email?.[0]}
          />

          <Button type="submit" pending={pending}>
            Enviar instrucciones
          </Button>

          <button
            type="button"
            onClick={onBack}
            className="flex items-center justify-center gap-1.5 text-sm text-blue-600 transition-colors hover:text-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 dark:text-slate-400 dark:text-slate-300"
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
