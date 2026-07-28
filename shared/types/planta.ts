export type PlantaRow = {
  id: number
  nombre: string
  direccion: string | null
  regionId: number | null
  nombreRegion: string | null
}

export type RegionRow = {
  id: number
  nombre: string
}
