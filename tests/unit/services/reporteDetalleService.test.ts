// tests/unit/services/reporteDetalleService.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  SAMPLING_RULES,
  getSamplingRule,
  signReporte,
  publishReporte,
} from '@/back/services/reporteDetalleService'

// ─── SAMPLING_RULES shape ────────────────────────────────────────────────────

describe('SAMPLING_RULES', () => {
  it('tiene exactamente 14 entradas', () => {
    expect(SAMPLING_RULES).toHaveLength(14)
  })

  it('está ordenado por min ascendente', () => {
    for (let i = 1; i < SAMPLING_RULES.length; i++) {
      expect(SAMPLING_RULES[i].min).toBeGreaterThan(SAMPLING_RULES[i - 1].min)
    }
  })
})

// ─── getSamplingRule — todos los rangos ──────────────────────────────────────

describe('getSamplingRule', () => {
  it('rango 1: min=2, max=8  → sampleSize=2, maxDefects=1', () => {
    expect(getSamplingRule(2)).toEqual({ min: 2, max: 8, sampleSize: 2, maxDefects: 1 })
    expect(getSamplingRule(5)).toEqual({ min: 2, max: 8, sampleSize: 2, maxDefects: 1 })
    expect(getSamplingRule(8)).toEqual({ min: 2, max: 8, sampleSize: 2, maxDefects: 1 })
  })

  it('rango 2: min=9, max=15 → sampleSize=2, maxDefects=1', () => {
    expect(getSamplingRule(9)).toEqual({ min: 9, max: 15, sampleSize: 2, maxDefects: 1 })
    expect(getSamplingRule(12)).toEqual({ min: 9, max: 15, sampleSize: 2, maxDefects: 1 })
    expect(getSamplingRule(15)).toEqual({ min: 9, max: 15, sampleSize: 2, maxDefects: 1 })
  })

  it('rango 3: min=16, max=25 → sampleSize=2, maxDefects=1', () => {
    expect(getSamplingRule(16)).toEqual({ min: 16, max: 25, sampleSize: 2, maxDefects: 1 })
    expect(getSamplingRule(20)).toEqual({ min: 16, max: 25, sampleSize: 2, maxDefects: 1 })
    expect(getSamplingRule(25)).toEqual({ min: 16, max: 25, sampleSize: 2, maxDefects: 1 })
  })

  it('rango 4: min=26, max=50 → sampleSize=2, maxDefects=1', () => {
    expect(getSamplingRule(26)).toEqual({ min: 26, max: 50, sampleSize: 2, maxDefects: 1 })
    expect(getSamplingRule(38)).toEqual({ min: 26, max: 50, sampleSize: 2, maxDefects: 1 })
    expect(getSamplingRule(50)).toEqual({ min: 26, max: 50, sampleSize: 2, maxDefects: 1 })
  })

  it('rango 5: min=51, max=90 → sampleSize=2, maxDefects=1', () => {
    expect(getSamplingRule(51)).toEqual({ min: 51, max: 90, sampleSize: 2, maxDefects: 1 })
    expect(getSamplingRule(70)).toEqual({ min: 51, max: 90, sampleSize: 2, maxDefects: 1 })
    expect(getSamplingRule(90)).toEqual({ min: 51, max: 90, sampleSize: 2, maxDefects: 1 })
  })

  it('rango 6: min=91, max=150 → sampleSize=2, maxDefects=1', () => {
    expect(getSamplingRule(91)).toEqual({ min: 91, max: 150, sampleSize: 2, maxDefects: 1 })
    expect(getSamplingRule(120)).toEqual({ min: 91, max: 150, sampleSize: 2, maxDefects: 1 })
    expect(getSamplingRule(150)).toEqual({ min: 91, max: 150, sampleSize: 2, maxDefects: 1 })
  })

  it('rango 7: min=151, max=280 → sampleSize=5, maxDefects=1', () => {
    expect(getSamplingRule(151)).toEqual({ min: 151, max: 280, sampleSize: 5, maxDefects: 1 })
    expect(getSamplingRule(200)).toEqual({ min: 151, max: 280, sampleSize: 5, maxDefects: 1 })
    expect(getSamplingRule(280)).toEqual({ min: 151, max: 280, sampleSize: 5, maxDefects: 1 })
  })

  it('rango 8: min=281, max=500 → sampleSize=8, maxDefects=1', () => {
    expect(getSamplingRule(281)).toEqual({ min: 281, max: 500, sampleSize: 8, maxDefects: 1 })
    expect(getSamplingRule(390)).toEqual({ min: 281, max: 500, sampleSize: 8, maxDefects: 1 })
    expect(getSamplingRule(500)).toEqual({ min: 281, max: 500, sampleSize: 8, maxDefects: 1 })
  })

  it('rango 9: min=501, max=1200 → sampleSize=12, maxDefects=2', () => {
    expect(getSamplingRule(501)).toEqual({ min: 501, max: 1200, sampleSize: 12, maxDefects: 2 })
    expect(getSamplingRule(850)).toEqual({ min: 501, max: 1200, sampleSize: 12, maxDefects: 2 })
    expect(getSamplingRule(1200)).toEqual({ min: 501, max: 1200, sampleSize: 12, maxDefects: 2 })
  })

  it('rango 10: min=1201, max=3200 → sampleSize=20, maxDefects=2', () => {
    expect(getSamplingRule(1201)).toEqual({ min: 1201, max: 3200, sampleSize: 20, maxDefects: 2 })
    expect(getSamplingRule(2000)).toEqual({ min: 1201, max: 3200, sampleSize: 20, maxDefects: 2 })
    expect(getSamplingRule(3200)).toEqual({ min: 1201, max: 3200, sampleSize: 20, maxDefects: 2 })
  })

  it('rango 11: min=3201, max=10000 → sampleSize=32, maxDefects=3', () => {
    expect(getSamplingRule(3201)).toEqual({ min: 3201, max: 10000, sampleSize: 32, maxDefects: 3 })
    expect(getSamplingRule(6000)).toEqual({ min: 3201, max: 10000, sampleSize: 32, maxDefects: 3 })
    expect(getSamplingRule(10000)).toEqual({ min: 3201, max: 10000, sampleSize: 32, maxDefects: 3 })
  })

  it('rango 12: min=10001, max=35000 → sampleSize=50, maxDefects=4', () => {
    expect(getSamplingRule(10001)).toEqual({ min: 10001, max: 35000, sampleSize: 50, maxDefects: 4 })
    expect(getSamplingRule(20000)).toEqual({ min: 10001, max: 35000, sampleSize: 50, maxDefects: 4 })
    expect(getSamplingRule(35000)).toEqual({ min: 10001, max: 35000, sampleSize: 50, maxDefects: 4 })
  })

  it('rango 13: min=35001, max=150000 → sampleSize=80, maxDefects=5', () => {
    expect(getSamplingRule(35001)).toEqual({ min: 35001, max: 150000, sampleSize: 80, maxDefects: 5 })
    expect(getSamplingRule(90000)).toEqual({ min: 35001, max: 150000, sampleSize: 80, maxDefects: 5 })
    expect(getSamplingRule(150000)).toEqual({ min: 35001, max: 150000, sampleSize: 80, maxDefects: 5 })
  })

  it('rango 14: min=150001, max=500000 → sampleSize=125, maxDefects=6', () => {
    expect(getSamplingRule(150001)).toEqual({ min: 150001, max: 500000, sampleSize: 125, maxDefects: 6 })
    expect(getSamplingRule(300000)).toEqual({ min: 150001, max: 500000, sampleSize: 125, maxDefects: 6 })
    expect(getSamplingRule(500000)).toEqual({ min: 150001, max: 500000, sampleSize: 125, maxDefects: 6 })
  })

  it('valor 1 (por debajo del mínimo) devuelve null', () => {
    expect(getSamplingRule(1)).toBeNull()
  })

  it('valor 0 devuelve null', () => {
    expect(getSamplingRule(0)).toBeNull()
  })

  it('valor 500001 (por encima del máximo) devuelve null', () => {
    expect(getSamplingRule(500001)).toBeNull()
  })

  it('límite entre rangos — 8 es max del rango 1, 9 es min del rango 2', () => {
    expect(getSamplingRule(8)).toEqual({ min: 2, max: 8, sampleSize: 2, maxDefects: 1 })
    expect(getSamplingRule(9)).toEqual({ min: 9, max: 15, sampleSize: 2, maxDefects: 1 })
  })
})

// ─── signReporte ─────────────────────────────────────────────────────────────

describe('signReporte', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    process.env.QSYNC_API_URL = 'http://localhost:3001'
    process.env.X_APP_TOKEN = 'test-token'
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('respuesta exitosa → { ok: true, status: "signed" }', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true }), { status: 200 }),
    )

    const result = await signReporte(42, 'access-token')
    expect(result).toEqual({ ok: true, status: 'signed' })
  })

  it('respuesta 404 → { ok: false, reason: "not_found" }', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response('Not Found', { status: 404 }),
    )

    const result = await signReporte(42, 'access-token')
    expect(result).toEqual({ ok: false, reason: 'not_found' })
  })

  it('respuesta 409 → { ok: false, reason: "invalid_status" }', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response('Conflict', { status: 409 }),
    )

    const result = await signReporte(42, 'access-token')
    expect(result).toEqual({ ok: false, reason: 'invalid_status' })
  })

  it('respuesta 500 → lanza error', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response('Server Error', { status: 500 }),
    )

    await expect(signReporte(42, 'access-token')).rejects.toThrow('sign failed: 500')
  })
})

// ─── publishReporte ──────────────────────────────────────────────────────────

describe('publishReporte', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    process.env.QSYNC_API_URL = 'http://localhost:3001'
    process.env.X_APP_TOKEN = 'test-token'
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('respuesta exitosa → { ok: true, status: "published" }', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true }), { status: 200 }),
    )

    const result = await publishReporte(99, 'access-token')
    expect(result).toEqual({ ok: true, status: 'published' })
  })

  it('respuesta 404 → { ok: false, reason: "not_found" }', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response('Not Found', { status: 404 }),
    )

    const result = await publishReporte(99, 'access-token')
    expect(result).toEqual({ ok: false, reason: 'not_found' })
  })

  it('respuesta 409 → { ok: false, reason: "invalid_status" }', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response('Conflict', { status: 409 }),
    )

    const result = await publishReporte(99, 'access-token')
    expect(result).toEqual({ ok: false, reason: 'invalid_status' })
  })

  it('respuesta 500 → lanza error', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response('Server Error', { status: 500 }),
    )

    await expect(publishReporte(99, 'access-token')).rejects.toThrow('publish failed: 500')
  })
})
