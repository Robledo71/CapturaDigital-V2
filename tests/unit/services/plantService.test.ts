// tests/unit/services/plantService.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock plantRepository so plantService doesn't call fetch directly
vi.mock('@/back/repositories/plantRepository', () => ({
  findAllPlants: vi.fn(),
  findAllRegiones: vi.fn(),
  createPlant: vi.fn(),
  updatePlant: vi.fn(),
}))

import { getAllPlantas, getRegiones, createPlanta, updatePlanta } from '@/back/services/plantService'
import {
  findAllPlants,
  findAllRegiones,
  createPlant,
  updatePlant,
} from '@/back/repositories/plantRepository'

function makePlantRecord() {
  return { id: 1, name: 'Planta Norte', address: 'Calle 1', regionId: 3, nombreRegion: 'Bajío' }
}

describe('plantService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ─── getAllPlantas ──────────────────────────────────────────────────────────

  describe('getAllPlantas', () => {
    it('fetch exitoso devuelve array de PlantaRow', async () => {
      vi.mocked(findAllPlants).mockResolvedValue([makePlantRecord()])

      const result = await getAllPlantas('token')

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        id: 1,
        nombre: 'Planta Norte',
        direccion: 'Calle 1',
        regionId: 3,
        nombreRegion: 'Bajío',
      })
    })

    it('repositorio devuelve array vacío → resultado vacío', async () => {
      vi.mocked(findAllPlants).mockResolvedValue([])

      const result = await getAllPlantas('token')
      expect(result).toEqual([])
    })
  })

  // ─── getRegiones ────────────────────────────────────────────────────────────

  describe('getRegiones', () => {
    it('devuelve el array de regiones del repositorio', async () => {
      vi.mocked(findAllRegiones).mockResolvedValue([{ id: 1, nombre: 'Bajío' }])

      const result = await getRegiones('token')

      expect(result).toEqual([{ id: 1, nombre: 'Bajío' }])
      expect(findAllRegiones).toHaveBeenCalledWith('token')
    })
  })

  // ─── createPlanta ──────────────────────────────────────────────────────────

  describe('createPlanta', () => {
    it('fetch exitoso devuelve { ok: true, planta }', async () => {
      vi.mocked(createPlant).mockResolvedValue(makePlantRecord())

      const result = await createPlanta(
        { nombre: 'Planta Norte', direccion: 'Calle 1', regionId: 3 },
        'token',
      )

      expect(result).toEqual({
        ok: true,
        planta: {
          id: 1,
          nombre: 'Planta Norte',
          direccion: 'Calle 1',
          regionId: 3,
          nombreRegion: 'Bajío',
        },
      })
    })

    it('se pasan los campos correctamente al repositorio', async () => {
      vi.mocked(createPlant).mockResolvedValue(makePlantRecord())

      await createPlanta(
        { nombre: 'Nueva Planta', direccion: 'Av Principal', regionId: 3 },
        'my-token',
      )

      expect(createPlant).toHaveBeenCalledWith(
        { name: 'Nueva Planta', address: 'Av Principal', regionId: 3 },
        'my-token',
      )
    })
  })

  // ─── updatePlanta ──────────────────────────────────────────────────────────

  describe('updatePlanta', () => {
    it('fetch exitoso devuelve { ok: true, planta }', async () => {
      vi.mocked(updatePlant).mockResolvedValue({
        id: 1,
        name: 'Planta Actualizada',
        address: null,
        regionId: null,
        nombreRegion: null,
      })

      const result = await updatePlanta(
        { id: 1, nombre: 'Planta Actualizada', direccion: 'Calle 1', regionId: 3 },
        'token',
      )

      expect(result).toEqual({
        ok: true,
        planta: expect.objectContaining({ id: 1, nombre: 'Planta Actualizada' }),
      })
    })

    it('se pasan los campos correctamente al repositorio', async () => {
      vi.mocked(updatePlant).mockResolvedValue(makePlantRecord())

      await updatePlanta(
        { id: 1, nombre: 'Planta', direccion: 'Calle 1', regionId: 3 },
        'token',
      )

      expect(updatePlant).toHaveBeenCalledWith(
        1,
        { name: 'Planta', address: 'Calle 1', regionId: 3 },
        'token',
      )
    })

    it('fetch 404 (repositorio lanza "not found") devuelve { ok: false, reason: "not_found" }', async () => {
      vi.mocked(updatePlant).mockRejectedValue(new Error('updatePlant: plant 99 not found'))

      const result = await updatePlanta(
        { id: 99, nombre: 'Inexistente', direccion: 'Calle 1', regionId: 3 },
        'token',
      )

      expect(result).toEqual({ ok: false, reason: 'not_found' })
    })

    it('error inesperado del repositorio se propaga', async () => {
      vi.mocked(updatePlant).mockRejectedValue(new Error('DB connection failed'))

      await expect(
        updatePlanta({ id: 1, nombre: 'Planta', direccion: 'Calle 1', regionId: 3 }, 'token'),
      ).rejects.toThrow('DB connection failed')
    })
  })
})
