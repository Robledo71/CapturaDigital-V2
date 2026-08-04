'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import type { InspectorRow } from '@/shared/types/inspector'
import { getSession } from '@/back/services/session'
import { createInspector, getNextInspectorCodigo } from '@/back/services/inspectorService'

// No existe un permiso fino para este módulo — se gatea directamente por rol.
// supervisor/lider solo ven/gestionan inspectores de su(s) propia(s) planta(s);
// superusuario/supervisor_regional ven todos (lo aplica el backend).
const ALLOWED_ROLES = new Set(['superusuario', 'admin', 'supervisor_regional', 'supervisor', 'lider'])

export type CreateInspectorState =
  | { ok: true; generatedPassword: string; inspector: InspectorRow }
  | { ok: false; error: string }
  | undefined

const CreateInspectorSchema = z.object({
  // El código de inspector lo genera automáticamente el backend (INS-00x); ya
  // no se captura en el formulario.
  nombre_empleado: z.string().min(1, 'El nombre es requerido').trim(),
  apellido_paterno: z.string().min(1, 'El apellido paterno es requerido').trim(),
  // Apellido materno opcional: si se deja vacío, la BD asigna 'X' por defecto.
  apellido_materno: z.string().trim().optional(),
  plantaIds: z.array(z.number().int().positive()),
})

// Preview read-only del próximo código de inspector (INS-00x) para el modal.
// Se gatea por los mismos roles que pueden crear inspectores.
export async function getNextInspectorCodeAction(): Promise<{ codigo: string | null }> {
  try {
    const session = await getSession()
    if (!session || !ALLOWED_ROLES.has(session.rol)) {
      return { codigo: null }
    }
    const codigo = await getNextInspectorCodigo(session.accessToken)
    return { codigo }
  } catch {
    return { codigo: null }
  }
}

export async function crearInspectorAction(
  _state: CreateInspectorState,
  formData: FormData,
): Promise<CreateInspectorState> {
  const session = await getSession()
  if (!session) {
    return { ok: false, error: 'Sesión expirada. Por favor inicia sesión nuevamente.' }
  }
  if (!ALLOWED_ROLES.has(session.rol)) {
    return { ok: false, error: 'No autorizado.' }
  }

  const plantaIds = formData
    .getAll('plantaIds')
    .map((v) => Number(v))
    .filter((n) => Number.isFinite(n) && n > 0)

  const apellidoMaternoRaw = String(formData.get('apellido_materno') ?? '').trim()

  const raw = {
    nombre_empleado: String(formData.get('nombre_empleado') ?? '').trim(),
    apellido_paterno: String(formData.get('apellido_paterno') ?? '').trim(),
    // Vacío → undefined para que quede opcional (la BD pone 'X').
    apellido_materno: apellidoMaternoRaw || undefined,
    plantaIds,
  }

  const validated = CreateInspectorSchema.safeParse(raw)
  if (!validated.success) {
    const firstIssue = validated.error.issues[0]
    return { ok: false, error: firstIssue?.message ?? 'Datos inválidos.' }
  }

  try {
    const result = await createInspector(
      {
        nombreEmpleado: validated.data.nombre_empleado,
        apellidoPaterno: validated.data.apellido_paterno,
        apellidoMaterno: validated.data.apellido_materno,
        plantaIds: validated.data.plantaIds,
      },
      session.accessToken,
    )

    if (!result.ok) {
      if (result.reason === 'limit') {
        return { ok: false, error: 'Se alcanzó el límite de 50 cuentas de inspector.' }
      }
      return { ok: false, error: 'Ya existe un usuario con ese código.' }
    }

    revalidatePath('/supervisor/inspectores')
    revalidatePath('/superusuario/inspectores')
    revalidatePath('/admin/inspectores')

    return { ok: true, generatedPassword: result.generatedPassword, inspector: result.inspector }
  } catch {
    return { ok: false, error: 'Error inesperado al crear el inspector.' }
  }
}
