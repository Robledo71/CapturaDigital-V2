'use server'

import { z } from 'zod'
import { resetPassword as doReset } from '@/back/services/passwordResetService'

const Schema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  confirmPassword: z.string().min(1, 'Confirma tu contraseña'),
}).refine(d => d.password === d.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
})

export type ResetPasswordState = {
  errors?: {
    password?: string[]
    confirmPassword?: string[]
    token?: string[]
  }
  success?: boolean
} | undefined

export async function resetPassword(
  state: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const raw = {
    token: formData.get('token') as string,
    password: formData.get('password') as string,
    confirmPassword: formData.get('confirmPassword') as string,
  }

  const validated = Schema.safeParse(raw)
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors as NonNullable<ResetPasswordState>['errors'] }
  }

  const result = await doReset(validated.data.token, validated.data.password)

  if (!result.ok) {
    if (result.reason === 'same_password') {
      return { errors: { password: ['La nueva contraseña no puede ser igual a la actual'] } }
    }
    return { errors: { token: ['Este enlace no es válido o ya expiró. Solicita uno nuevo.'] } }
  }

  return { success: true }
}
