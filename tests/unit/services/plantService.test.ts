// tests/unit/services/plantService.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock plantRepository so plantService doesn't call fetch directly
vi.mock('@/back/repositories/plantRepository', () => ({
  findAllPlants: vi.fn(),
  createPlant: vi.fn(),
  updatePlant: vi.fn(),
}))

import { getAllPlantas, createPlanta, updatePlanta } from '@/back/services/plantService'
import {
  findAllPlants,
  createPlant,
  updatePlant,
} from '@/back/repositories/plantRepository'

function makePlantRecord() {
  return { id: 1, name: 'Planta Norte', address: 'Calle 1' }
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
      })
    })

    it('repositorio devuelve array vacío → resultado vacío', async () => {
      vi.mocked(findAllPlants).mockResolvedValue([])

      const result = await getAllPlantas('token')
      expect(result).toEqual([])
    })
  })

  // ─── createPlanta ──────────────────────────────────────────────────────────

  describe('createPlanta', () => {
    it('fetch exitoso devuelve { ok: true, planta }', async () => {
      vi.mocked(createPlant).mockResolvedValue(makePlantRecord())

      const result = await createPlanta({ nombre: 'Planta Norte', direccion: 'Calle 1' }, 'token')

      expect(result).toEqual({
        ok: true,
        planta: {
          id: 1,
          nombre: 'Planta Norte',
          direccion: 'Calle 1',
        },
      })
    })

    it('se pasan los campos correctamente al repositorio', async () => {
      vi.mocked(createPlant).mockResolvedValue(makePlantRecord())

      await createPlanta({ nombre: 'Nueva Planta', direccion: 'Av Principal' }, 'my-token')

      expect(createPlant).toHaveBeenCalledWith(
        { name: 'Nueva Planta', address: 'Av Principal' },
        'my-token',
      )
    })
  })

  // ─── updatePlanta ──────────────────────────────────────────────────────────

  describe('updatePlanta', () => {
    it('fetch exitoso devuelve { ok: true, planta }', async () => {
      vi.mocked(updatePlant).mockResolvedValue({ id: 1, name: 'Planta Actualizada', address: null })

      const result = await updatePlanta({ id: 1, nombre: 'Planta Actualizada' }, 'token')

      expect(result).toEqual({
        ok: true,
        planta: expect.objectContaining({ id: 1, nombre: 'Planta Actualizada' }),
      })
    })

    it('fetch 404 (repositorio lanza "not found") devuelve { ok: false, reason: "not_found" }', async () => {
      vi.mocked(updatePlant).mockRejectedValue(new Error('updatePlant: plant 99 not found'))

      const result = await updatePlanta({ id: 99, nombre: 'Inexistente' }, 'token')

      expect(result).toEqual({ ok: false, reason: 'not_found' })
    })

    it('error inesperado del repositorio se propaga', async () => {
      vi.mocked(updatePlant).mockRejectedValue(new Error('DB connection failed'))

      await expect(updatePlanta({ id: 1, nombre: 'Planta' }, 'token')).rejects.toThrow(
        'DB connection failed',
      )
    })
  })
})
