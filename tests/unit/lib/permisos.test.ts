// tests/unit/lib/permisos.test.ts
import { describe, it, expect } from 'vitest'
import { getPermisos, can, ROLE_PERMISOS } from '@/front/lib/permisos'

describe('getPermisos — fallback a SEED vs permisos del JWT', () => {
  it('sin sesión → arreglo vacío', () => {
    expect(getPermisos(null)).toEqual([])
    expect(getPermisos(undefined)).toEqual([])
  })

  it('permisos undefined → cae a la matriz SEED del rol (sesión previa a la migración)', () => {
    const session = { rol: 'supervisor' as const }
    expect(getPermisos(session)).toEqual(ROLE_PERMISOS.supervisor)
  })

  it('permisos definidos (no vacíos) → se usan tal cual, NO el SEED', () => {
    const session = { rol: 'supervisor', permisos: ['reportes.ver'] }
    expect(getPermisos(session)).toEqual(['reportes.ver'])
  })

  it('BLINDAJE: permisos = [] → sin permisos (NO cae al SEED)', () => {
    // Caso: a un usuario se le revocaron TODOS los permisos. Antes, tratar [] como
    // "sin datos" le devolvía el set completo del rol — el hueco que cerramos.
    const session = { rol: 'supervisor', permisos: [] as string[] }
    expect(getPermisos(session)).toEqual([])
    expect(can(session, 'reportes.firmar')).toBe(false)
    expect(can(session, 'reportes.ver')).toBe(false)
  })
})
