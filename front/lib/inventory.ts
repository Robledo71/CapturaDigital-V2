// Cálculo de consumo de inventario de una orden (a partir de sus ítems).
//
// `inventario` es la cantidad planeada y `inventarioTerminado` se incrementa con cada
// reporte que llega (qb_sync: UPDATE order_items SET inventory_done = ...). Cuando el
// consumo alcanza el umbral, se considera "por agotarse" y se alerta.

export const INVENTORY_ALERT_THRESHOLD = 0.8

export type InventoryItemLike = {
  inventario: number
  inventarioTerminado: number
}

/** Nivel de consumo: ok (<80%), warning (≥80% por agotarse), complete (≥100% completado), indefinite (planta sin inventario). */
export type InventoryLevel = 'ok' | 'warning' | 'complete' | 'indefinite'

export type OrderInventory = {
  total: number
  done: number
  /** Proporción consumida, 0..1+ (0 si no hay inventario planeado). */
  pct: number
  /** true cuando se alcanzó el umbral de aviso (≥80%, incluye completado). Genera notificación. */
  alert: boolean
  /** true cuando el inventario se completó (≥100%). */
  complete: boolean
  /** true cuando la planta no maneja inventario (es indefinido por diseño). */
  indefinite: boolean
  level: InventoryLevel
}

// Plantas que NO manejan inventario (es indefinido). Configurable.
// Matchea por nombre normalizado (sin acentos, minúsculas) que contenga el token.
// "celaya" cubre "Honda de México, Planta Celaya" y cualquier variante con acento.
// Para ampliar, agrega más tokens a este arreglo; o migrar a plantId si se requiere.
const INDEFINITE_INVENTORY_PLANT_TOKENS = ['celaya']

function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

export function isIndefiniteInventoryPlant(plantName: string | null | undefined): boolean {
  if (!plantName) return false
  const n = normalize(plantName)
  return INDEFINITE_INVENTORY_PLANT_TOKENS.some((t) => n.includes(t))
}

export function getOrderInventory(items: InventoryItemLike[], indefinite = false): OrderInventory {
  if (indefinite) {
    return { total: 0, done: 0, pct: 0, alert: false, complete: false, indefinite: true, level: 'indefinite' }
  }
  const total = items.reduce((sum, i) => sum + (i.inventario || 0), 0)
  const done = items.reduce((sum, i) => sum + (i.inventarioTerminado || 0), 0)
  const pct = total > 0 ? done / total : 0
  const complete = total > 0 && pct >= 1
  const alert = total > 0 && pct >= INVENTORY_ALERT_THRESHOLD
  const level: InventoryLevel = complete ? 'complete' : alert ? 'warning' : 'ok'
  return { total, done, pct, alert, complete, indefinite: false, level }
}
