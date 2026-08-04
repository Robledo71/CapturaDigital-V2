'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import type { InspectorRow } from '@/shared/types/inspector'
import { getSession } from '@/back/services/session'
import { updateInspectorName } from '@/back/services/inspectorService'

// No existe un permiso fino para este módulo — se gatea directamente por rol.
const ALLOWED_ROLES = new Set(['superusuario', 'supervisor_regional', 'supervisor', 'lider'])

export type UpdateInspectorState =
  | { ok: true; inspector: InspectorRow }
  | { ok: false; error: string }
  | undefined

const UpdateInspectorSchema = z.object({
  empleadoId: z.number().int().positive(),
  nombre_empleado: z.string().min(1, 'El nombre es requerido').trim(),
  apellido_paterno: z.string().min(1, 'El apellido paterno es requerido').trim(),
  // Apellido materno opcional: si se deja vacío, el backend asigna 'X' por defecto.
  apellido_materno: z.string().trim().optional(),
})

export async function editarInspectorAction(
  _state: UpdateInspectorState,
  formData: FormData,
): Promise<UpdateInspectorState> {
  const session = await getSession()
  if (!session) {
    return { ok: false, error: 'Sesión expirada. Por favor inicia sesión nuevamente.' }
  }
  if (!ALLOWED_ROLES.has(session.rol)) {
    return { ok: false, error: 'No autorizado.' }
  }

  const apellidoMaternoRaw = String(formData.get('apellido_materno') ?? '').trim()

  const raw = {
    empleadoId: Number(formData.get('empleadoId') ?? ''),
    nombre_empleado: String(formData.get('nombre_empleado') ?? '').trim(),
    apellido_paterno: String(formData.get('apellido_paterno') ?? '').trim(),
    // Vacío → undefined para que quede opcional (el backend guarda 'X').
    apellido_materno: apellidoMaternoRaw || undefined,
  }

  const validated = UpdateInspectorSchema.safeParse(raw)
  if (!validated.success) {
    const firstIssue = validated.error.issues[0]
    return { ok: false, error: firstIssue?.message ?? 'Datos inválidos.' }
  }

  try {
    const result = await updateInspectorName(
      validated.data.empleadoId,
      {
        nombreEmpleado: validated.data.nombre_empleado,
        apellidoPaterno: validated.data.apellido_paterno,
        apellidoMaterno: validated.data.apellido_materno,
      },
      session.accessToken,
    )

    if (!result.ok) {
      if (result.reason === 'not_found') {
        return { ok: false, error: 'El inspector no existe.' }
      }
      return { ok: false, error: 'No tienes permiso para editar este inspector.' }
    }

    revalidatePath('/supervisor/inspectores')
    revalidatePath('/superusuario/inspectores')

    return { ok: true, inspector: result.inspector }
  } catch {
    return { ok: false, error: 'Error inesperado al actualizar el inspector.' }
  }
}
