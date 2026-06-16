/**
 * Shared avatar-color helpers.
 * Used by any component that renders an inspector avatar circle so that a given
 * inspector name always resolves to the same Tailwind background class across
 * every table in the application.
 */

export const AVATAR_COLORS = [
  'bg-blue-600',
  'bg-violet-600',
  'bg-teal-600',
  'bg-indigo-600',
  'bg-orange-600',
  'bg-rose-600',
] as const

/**
 * Returns a deterministic Tailwind background-color class for `nombre`.
 * Uses `nombre.length % AVATAR_COLORS.length` so the same name always maps
 * to the same color regardless of where it is rendered.
 */
export function getAvatarColor(nombre: string): string {
  return AVATAR_COLORS[nombre.length % AVATAR_COLORS.length]
}
