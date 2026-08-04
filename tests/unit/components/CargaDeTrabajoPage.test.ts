
// tests/unit/components/CargaDeTrabajoPage.test.ts
import { describe, it, expect } from 'vitest'
import { isInventarioPendiente } from '@/front/components/supervisor/CargaDeTrabajoPage'

// ─── isInventarioPendiente ──────────────────────────────────────────────────
// Regla de negocio: no se puede liberar la asignación de un item mientras el
// inventario esté pendiente por completar. El backend valida esto y responde
// 409; esta función refleja la misma regla en el frontend para deshabilitar
// el botón "Liberar" antes de intentar la petición.

describe('isInventarioPendiente', () => {
  it('inventario incompleto y planta NO indefinida → pendiente', () => {
    const item = { inventario: 100, inventarioTerminado: 40 }
    expect(isInventarioPendiente(item, false)).toBe(true)
  })

  it('inventario completo → NO pendiente', () => {
    const item = { inventario: 100, inventarioTerminado: 100 }
    expect(isInventarioPendiente(item, false)).toBe(false)
  })

  it('inventario sobre-completado (terminado > inventario) → NO pendiente', () => {
    const item = { inventario: 100, inventarioTerminado: 120 }
    expect(isInventarioPendiente(item, false)).toBe(false)
  })

  it('inventario en 0 → NO pendiente (nada que completar)', () => {
    const item = { inventario: 0, inventarioTerminado: 0 }
    expect(isInventarioPendiente(item, false)).toBe(false)
  })

  it('planta de inventario indefinido → nunca pendiente, aunque falte inventario', () => {
    const item = { inventario: 100, inventarioTerminado: 40 }
    expect(isInventarioPendiente(item, true)).toBe(false)
  })
})
