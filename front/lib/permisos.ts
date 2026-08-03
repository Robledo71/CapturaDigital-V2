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
  | 'superusuario'
  | 'admin'
  | 'supervisor'
  | 'supervisor_regional'
  | 'lider'
  | 'capturacion'
  | 'servicio_cliente'
  | 'cliente'
  | 'gerente'
  | 'inspector'

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
  // Órdenes informales (ad-hoc, fuera de SysQB)
  'ordenes_informales.ver',
  'ordenes_informales.crear',
  'ordenes_informales.asignar',
  // Reportes informales (muestreo/editar/firmar; NO publicar hasta promover a formal)
  'reportes_informales.ver',
  'reportes_informales.muestreo',
  'reportes_informales.editar',
  'reportes_informales.firmar',
  'reportes_informales.promover',
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
  // Superusuario: acceso absoluto a todos los módulos y acciones.
  superusuario: TODOS_LOS_PERMISOS,

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
    'usuarios.crear_cliente',
    'historial.ver',
    // Órdenes/reportes informales: mecánica completa
    'ordenes_informales.ver',
    'ordenes_informales.crear',
    'ordenes_informales.asignar',
    'reportes_informales.ver',
    'reportes_informales.muestreo',
    'reportes_informales.editar',
    'reportes_informales.firmar',
    'reportes_informales.promover',
  ],

  // Supervisor regional: mismo alcance operativo que el supervisor, pero cross-planta
  // (el filtro de planta lo maneja el backend). Reusa el portal /supervisor.
  supervisor_regional: [
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
    'usuarios.crear_cliente',
    'historial.ver',
    'ordenes_informales.ver',
    'ordenes_informales.crear',
    'ordenes_informales.asignar',
    'reportes_informales.ver',
    'reportes_informales.muestreo',
    'reportes_informales.editar',
    'reportes_informales.firmar',
    'reportes_informales.promover',
  ],

  // Líder de planta (reusa la vista de supervisor y entra a captura)
  lider: [
    'supervisor.ver',
    'capturacion.ver',
    'reportes.ver',
    'cotizaciones.importar',
    'ordenes.ver',
    'ordenes.descargar',
    'ordenes.asignar',
    'historial.ver',
    'ordenes_informales.ver',
    'ordenes_informales.crear',
    'ordenes_informales.asignar',
    'reportes_informales.ver',
    'reportes_informales.muestreo',
    'reportes_informales.editar',
    'reportes_informales.firmar',
    'reportes_informales.promover',
  ],

  // Capturación (PIERDE el desbloqueo de cotizaciones)
  capturacion: [
    'capturacion.ver',
    'reportes.ver',
    'ordenes.ver',
    'ordenes.descargar',
    // Consulta (lectura) de órdenes/reportes informales
    'ordenes_informales.ver',
    'reportes_informales.ver',
  ],

  // Servicio al cliente (rol nuevo): ve órdenes descargadas y bloquea/desbloquea
  servicio_cliente: [
    'servicio_cliente.ver',
    'reportes.ver',
    'ordenes.ver',
    'ordenes.descargar',
    'cotizaciones.bloquear',
    'cotizaciones.desbloquear',
    'ordenes_informales.ver',
    'reportes_informales.ver',
  ],

  // Cliente (pendiente de implementar su portal)
  cliente: [],

  // Inspector: rol de la app móvil; no accede al portal web de staff (el backend
  // lo bloquea con wrong_app). Sin permisos de portal.
  inspector: [],

  // Gerente: solo lectura, ve todo sin filtro de planta
  gerente: [
    'gerente.ver',
    'reportes.ver',
    'ordenes.ver',
    'ordenes.descargar',
    'historial.ver',
    'ordenes_informales.ver',
    'reportes_informales.ver',
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
