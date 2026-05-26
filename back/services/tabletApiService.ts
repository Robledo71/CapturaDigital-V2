// TODO Fase 2: pendiente de rehacer con InspectionSession y nuevo esquema. Funciones stubbeadas.
import 'server-only'
import type {
  AssignedItemDto,
  IniciarItemRequest,
  IniciarItemResponse,
  SubmitInspectionItemInput,
  SubmitItemsResponse,
  FinalizarSessionResponse,
} from '@/shared/types/tabletApi'

export type IniciarResult =
  | { ok: true; data: IniciarItemResponse }
  | { ok: false; status: 403 | 409 | 422; error: string }

export type SubmitItemsResult =
  | { ok: true; data: SubmitItemsResponse }
  | { ok: false; status: 403 | 409 | 422; error: string }

export type FinalizarResult =
  | { ok: true; data: FinalizarSessionResponse }
  | { ok: false; status: 403 | 409 | 422; error: string }

export async function getAssignedItemsForTablet(_tabletId: number): Promise<AssignedItemDto[]> {
  return []
}

export async function iniciarInspeccion(
  _orderItemId: number,
  _tabletId: number,
  _body: IniciarItemRequest,
): Promise<IniciarResult> {
  return { ok: false, status: 422, error: 'Endpoint temporalmente deshabilitado durante migración — Fase 2 pendiente' }
}

export async function submitInspectionItems(
  _sessionId: number,
  _tabletId: number,
  _items: SubmitInspectionItemInput[],
): Promise<SubmitItemsResult> {
  return { ok: false, status: 422, error: 'Endpoint temporalmente deshabilitado durante migración — Fase 2 pendiente' }
}

export async function finalizarSesion(
  _sessionId: number,
  _tabletId: number,
): Promise<FinalizarResult> {
  return { ok: false, status: 422, error: 'Endpoint temporalmente deshabilitado durante migración — Fase 2 pendiente' }
}
