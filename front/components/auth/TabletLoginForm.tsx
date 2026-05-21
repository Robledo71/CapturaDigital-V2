'use client'

import { useActionState } from 'react'
import { loginTabletUser, type LoginState } from '@/app/(auth)/tablet/login/actions'
import { Input } from '@/front/components/ui/Input'
import { Button } from '@/front/components/ui/Button'

export function TabletLoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginTabletUser, undefined)

  return (
    <form action={action} className="flex flex-col gap-5">
      {state?.errors?.general && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
          {state.errors.general.map((msg) => (
            <p key={msg} className="text-sm text-red-400">{msg}</p>
          ))}
        </div>
      )}

      <Input
        id="identifier"
        name="identifier"
        label="Usuario / # empleado"
        placeholder="I-014"
        autoComplete="username"
        error={state?.errors?.identifier?.[0]}
      />

      <Input
        id="password"
        name="password"
        type="password"
        label="Contraseña"
        autoComplete="current-password"
        error={state?.errors?.password?.[0]}
      />

      <Button type="submit" pending={pending}>
        Iniciar turno
      </Button>
    </form>
  )
}
