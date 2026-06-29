/**
 * Módulo central de permisos (RBAC con acción fina).
 *
 * Este archivo es el "contrato" de permisos del frontend: define el catálogo de
 * permisos atómicos y el helper `can()` que toda capa (guard de sección, sidebar,
 * botón de UI y server action) debe usar para preguntar "¿este usuario puede X?".
 *
 * ── Fuente de verdad ──────────────────────────────────────────────────────────
 * La asignación rol → permisos vivirá en el backend qb_sync (tabla role_permissions,
 * editable desde la pantalla de admin "Permisos"). El login devolverá el set de
 * permisos efectivos en el JWT (`session.permisos`).
 *
 * Mientras qb_sync no entregue `permisos`, `getPermisos()` usa la matriz por defecto
 * `ROLE_PERMISOS` de abajo como SEED. Cuando el JWT empiece a traer `permisos`, el
 * helper lo usa automáticamente y esta matriz queda solo como respaldo/semilla.
 * El contrato (las claves de permiso + `can()`) NO cambia en esa migración.
 */

// ─── Roles ──────────────────────────────────────────────────────────────────────

export type Rol =
  | 'admin'
  | 'supervisor'
  | 'lider'
  | 'capturacion'
  | 'servicio_cliente'
  | 'cliente'
  | 'gerente'

// ─── Catálogo de permisos (acción fina, agrupados por módulo) ────────────────────

export const PERMISOS = [
  // Reportes
  'reportes.ver',
  'reportes.editar',
  'reportes.publicar',
  'reportes.firmar',
  'reportes.muestreo',
  // Cotizaciones
  'cotizaciones.importar',
  'cotizaciones.bloquear',
  'cotizaciones.desbloquear',
  // Órdenes
  'ordenes.ver',
  'ordenes.descargar',
  'ordenes.asignar',
  'ordenes.documentos',
  // Tablets
  'tablets.ver',
  'tablets.gestionar',
  // Administración (CRUD de catálogos)
  'usuarios.crud',
  'usuarios.crear_cliente',
  'clientes.crud',
  'plantas.crud',
  // Acceso a secciones (vistas)
  'admin.ver',
  'supervisor.ver',
  'capturacion.ver',
  'servicio_cliente.ver',
  'gerente.ver',
  // Auditoría
  'historial.ver',
  // Meta: habilita la propia pantalla de configuración de permisos
  'permisos.configurar',
] as const

export type Permiso = (typeof PERMISOS)[number]

// ─── Matriz rol → permisos (SEED — se migrará a qb_sync) ──────────────────────────
//
// Refleja el acceso actual del sistema, con UN cambio acordado: bloquear/desbloquear
// cotizaciones pasa a `admin` + `servicio_cliente` (supervisor y capturacion lo pierden).

const TODOS_LOS_PERMISOS = [...PERMISOS] as Permiso[]

export const ROLE_PERMISOS: Record<Rol, Permiso[]> = {
  // Acceso total
  admin: TODOS_LOS_PERMISOS,

  // Supervisión y gestión de captura (SIN bloquear/desbloquear)
  supervisor: [
    'supervisor.ver',
    'reportes.ver',
    'reportes.editar',
    'reportes.publicar',
    'reportes.firmar',
    'reportes.muestreo',
    'cotizaciones.importar',
    'ordenes.ver',
    'ordenes.asignar',
    'ordenes.documentos',
    // tablets.ver: supervisor tiene su página de control de tablets (solo lectura).
    // NO tablets.gestionar: el alta/edición/baja de tablets es admin-only (la UI de
    // mutación vive únicamente en /admin).
    'tablets.ver',
    'usuarios.crear_cliente',
    'historial.ver',
  ],

  // Líder de planta (reusa la vista de supervisor y entra a captura)
  lider: [
    'supervisor.ver',
    'capturacion.ver',
    'reportes.ver',
    'reportes.editar',
    'ordenes.ver',
    'ordenes.descargar',
  ],

  // Capturación (PIERDE el desbloqueo de cotizaciones)
  capturacion: [
    'capturacion.ver',
    'reportes.ver',
    'ordenes.ver',
    'ordenes.descargar',
  ],

  // Servicio al cliente (rol nuevo): ve órdenes descargadas y bloquea/desbloquea
  servicio_cliente: [
    'servicio_cliente.ver',
    'reportes.ver',
    'ordenes.ver',
    'ordenes.descargar',
    'cotizaciones.bloquear',
    'cotizaciones.desbloquear',
  ],

  // Cliente (pendiente de implementar su portal)
  cliente: [],

  // Gerente: solo lectura, ve todo sin filtro de planta
  gerente: [
    'gerente.ver',
    'reportes.ver',
    'ordenes.ver',
    'ordenes.descargar',
    'historial.ver',
  ],
}

// ─── Helpers ──────────────────────────────────────────────────────────────────────

/** Forma mínima de sesión que necesitan los helpers (no acopla al módulo server-only). */
export type SessionLike = {
  rol: string
  permisos?: string[] | null
}

/**
 * Permisos efectivos del usuario.
 * Usa `session.permisos` (del JWT, fuente de verdad qb_sync) si **viene definido**
 * — incluso si es un arreglo vacío, que significa "este usuario no tiene permisos"
 * (p.ej. se le revocaron todos). Solo cae a la matriz SEED cuando `permisos` es
 * `undefined`/`null`, es decir, cuando el login no los entregó (sesión previa a la
 * migración a qb_sync). Tratar `[]` como "sin datos" abriría un hueco: revocar todo
 * devolvería al usuario el set completo del rol.
 */
export function getPermisos(session: SessionLike | null | undefined): Permiso[] {
  if (!session) return []
  if (session.permisos != null) {
    return session.permisos as Permiso[]
  }
  return ROLE_PERMISOS[session.rol as Rol] ?? []
}

/** ¿El usuario tiene el permiso indicado? */
export function can(session: SessionLike | null | undefined, permiso: Permiso): boolean {
  return getPermisos(session).includes(permiso)
}

/** ¿El usuario tiene AL MENOS uno de los permisos indicados? */
export function canAny(session: SessionLike | null | undefined, permisos: Permiso[]): boolean {
  const efectivos = getPermisos(session)
  return permisos.some((p) => efectivos.includes(p))
}
