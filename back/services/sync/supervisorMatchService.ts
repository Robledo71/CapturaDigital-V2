import type { PrismaClient } from '@prisma/client';

// Decision (2026-05-15): orders synced from legacy get a v2 supervisor
// auto-assigned based on Usuario.planta == legacy.orders.plant_name. If no
// match, supervisorId stays null and the order shows up in a "Sin asignar"
// tab where any supervisor can adopt it.
//
// Matching strategy: case-insensitive exact match. Both sides are free-text
// strings set by admins; fuzzy matching would risk wrong attribution.

export async function buildPlantToSupervisorMap(
  prisma: PrismaClient
): Promise<Map<string, string>> {
  const supervisors = await prisma.usuario.findMany({
    where: { rol: 'supervisor', isActive: true },
    select: { id: true, planta: true },
  });

  const map = new Map<string, string>();
  for (const s of supervisors) {
    const key = s.planta.trim().toLowerCase();
    if (key && !map.has(key)) {
      // First active supervisor per planta wins. Conflicts are silent because
      // there's no clean tie-breaker; flag this in syncRun.stats if needed.
      map.set(key, s.id);
    }
  }
  return map;
}

export function matchSupervisorByPlanta(
  map: Map<string, string>,
  plantName: string | null
): string | null {
  if (!plantName) return null;
  return map.get(plantName.trim().toLowerCase()) ?? null;
}
