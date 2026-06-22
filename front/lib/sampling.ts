/**
 * Tabla de muestreo de liberación (rangos por cantidad inspeccionada).
 *
 * Single source of truth, client-safe (sin 'server-only'): la usa tanto el cálculo
 * server-side en `reporteDetalleService` como la UI del modal de muestreo
 * (`ReporteDetallePage`) para mostrar la tabla de rangos.
 *
 * Cada regla: para un lote inspeccionado en [min, max] piezas, se muestrean
 * `sampleSize` piezas y se aceptan hasta `maxDefects` defectuosas.
 */
export type SamplingRule = {
  min: number
  max: number
  sampleSize: number
  maxDefects: number
}

export const SAMPLING_RULES: SamplingRule[] = [
  { min: 2, max: 8, sampleSize: 2, maxDefects: 1 },
  { min: 9, max: 15, sampleSize: 2, maxDefects: 1 },
  { min: 16, max: 25, sampleSize: 2, maxDefects: 1 },
  { min: 26, max: 50, sampleSize: 2, maxDefects: 1 },
  { min: 51, max: 90, sampleSize: 2, maxDefects: 1 },
  { min: 91, max: 150, sampleSize: 2, maxDefects: 1 },
  { min: 151, max: 280, sampleSize: 5, maxDefects: 1 },
  { min: 281, max: 500, sampleSize: 8, maxDefects: 1 },
  { min: 501, max: 1200, sampleSize: 12, maxDefects: 2 },
  { min: 1201, max: 3200, sampleSize: 20, maxDefects: 2 },
  { min: 3201, max: 10000, sampleSize: 32, maxDefects: 3 },
  { min: 10001, max: 35000, sampleSize: 50, maxDefects: 4 },
  { min: 35001, max: 150000, sampleSize: 80, maxDefects: 5 },
  { min: 150001, max: 500000, sampleSize: 125, maxDefects: 6 },
]

/** Regla aplicable a una cantidad inspeccionada, o null si está fuera de rango. */
export function getSamplingRule(inspected: number): SamplingRule | null {
  return SAMPLING_RULES.find((rule) => inspected >= rule.min && inspected <= rule.max) ?? null
}
