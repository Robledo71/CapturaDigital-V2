'use server'

import { getSession } from '@/back/services/session'
import { can } from '@/front/lib/permisos'
import {
  getNextCodigoEmpleado,
  checkCodigoEmpleadoExists,
} from '@/back/services/userService'

export async function getNextEmployeeCodeAction(): Promise<{ codigo: string | null }> {
  try {
    const session = await getSession()
    if (!session || !can(session, 'usuarios.crud')) {
      return { codigo: null }
    }
    const codigo = await getNextCodigoEmpleado(session.accessToken)
    return { codigo }
  } catch {
    return { codigo: null }
  }
}

export async function checkEmployeeCodeAction(codigo: string): Promise<{ exists: boolean }> {
  try {
    const session = await getSession()
    if (!session || !can(session, 'usuarios.crud')) {
      return { exists: false }
    }
    const trimmed = codigo.trim()
    if (!trimmed) return { exists: false }
    const exists = await checkCodigoEmpleadoExists(trimmed, session.accessToken)
    return { exists }
  } catch {
    return { exists: false }
  }
}
