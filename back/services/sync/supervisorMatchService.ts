// TODO Fase 4: sync deshabilitado. planta field eliminado de Usuario. Funciones stubbeadas.

export async function buildPlantToSupervisorMap(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _prisma: any
): Promise<Map<string, string>> {
  return new Map()
}

export function matchSupervisorByPlanta(
  _map: Map<string, string>,
  _plantName: string | null
): string | null {
  return null
}
