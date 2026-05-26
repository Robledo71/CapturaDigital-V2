'use client'

import { useActionState } from 'react'
import { resetPassword, type ResetPasswordState } from '@/app/actions/reset-password'
import { Input } from '@/front/components/ui/Input'
import { Button } from '@/front/components/ui/Button'
import Image from 'next/image'
import { ArrowLeft, CheckCircle } from 'lucide-react'

interface ResetPasswordFormProps {
  token: string
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const [state, action, pending] = useActionState<ResetPasswordState, FormData>(
    resetPassword,
    undefined,
  )

  // Token inválido o expirado — error prominente en lugar del formulario
  if (state?.errors?.token) {
    return (
      <>
        {/* Icon */}
        <div className="mb-6 flex justify-center">
          <Image
            src="/logoCheck.png"
            alt="Quality Bolca"
            width={100}
            height={100}
            className="rounded-xl"
            priority
          />
        </div>

        {/* Header */}
        <h1 className="mb-2 text-center text-2xl font-bold text-blue-950 dark:text-white">
          Nueva contraseña
        </h1>
        <p className="mb-8 text-center text-sm leading-relaxed text-blue-600 dark:text-slate-400">
          Elige una contraseña segura para tu cuenta
        </p>

        {/* Token error panel */}
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-4">
          {state.errors.token.map((msg) => (
            <p key={msg} className="text-sm text-red-400">
              {msg}
            </p>
          ))}
          <a
            href="/"
            className="mt-3 flex items-center gap-1.5 text-sm text-blue-400 transition-colors hover:text-blue-300"
          >
            <ArrowLeft size={14} />
            Solicitar nuevo enlace
          </a>
        </div>
      </>
    )
  }

  // Estado de éxito
  if (state?.success) {
    return (
      <>
        {/* Icon */}
        <div className="mb-6 flex justify-center">
          <Image
            src="/logoCheck.png"
            alt="Quality Bolca"
            width={100}
            height={100}
            className="rounded-xl"
            priority
          />
        </div>

        {/* Header */}
        <h1 className="mb-2 text-center text-2xl font-bold text-blue-950 dark:text-white">
          Nueva contraseña
        </h1>
        <p className="mb-8 text-center text-sm leading-relaxed text-blue-600 dark:text-slate-400">
          Elige una contraseña segura para tu cuenta
        </p>

        {/* Success state */}
        <div className="flex flex-col items-center gap-5 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/15 ring-1 ring-green-500/30">
            <CheckCircle size={30} className="text-green-400" />
          </div>
          <div>
            <p className="font-semibold text-blue-950 dark:text-white">
              ¡Contraseña actualizada!
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-blue-600 dark:text-slate-400">
              Tu contraseña fue cambiada exitosamente. Ya puedes iniciar sesión.
            </p>
          </div>
          <a
            href="/"
            className="flex items-center gap-1.5 text-sm text-blue-400 transition-colors hover:text-blue-300"
          >
            <ArrowLeft size={14} />
            Ir al inicio de sesión
          </a>
        </div>
      </>
    )
  }

  // Estado normal — formulario
  return (
    <>
      {/* Icon */}
      <div className="mb-6 flex justify-center">
        <Image
          src="/logoCheck.png"
          alt="Quality Bolca"
          width={100}
          height={100}
          className="rounded-xl"
          priority
        />
      </div>

      {/* Header */}
      <h1 className="mb-2 text-center text-2xl font-bold text-blue-950 dark:text-white">
        Nueva contraseña
      </h1>
      <p className="mb-8 text-center text-sm leading-relaxed text-blue-600 dark:text-slate-400">
        Elige una contraseña segura para tu cuenta
      </p>

      {/* Form */}
      <form action={action} className="flex flex-col gap-5">
        <input type="hidden" name="token" value={token} />

        <Input
          id="password"
          name="password"
          type="password"
          label="Nueva contraseña"
          autoComplete="new-password"
          error={state?.errors?.password?.[0]}
        />

        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          label="Confirmar nueva contraseña"
          autoComplete="new-password"
          error={state?.errors?.confirmPassword?.[0]}
        />

        <Button type="submit" pending={pending}>
          Cambiar contraseña
        </Button>
      </form>
    </>
  )
}
