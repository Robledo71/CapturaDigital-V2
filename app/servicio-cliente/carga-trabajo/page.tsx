import { redirect } from 'next/navigation'
import { getSession } from '@/back/services/session'
import { can } from '@/front/lib/permisos'
import { getCargaDeTrabajoData } from '@/back/services/cargaDeTrabajoService'
import { CargaDeTrabajoPage } from '@/front/components/supervisor/CargaDeTrabajoPage'

export const metadata = {
  title: 'Carga de trabajo — Servicio al Cliente',
}

export default async function ServicioClienteCargaTrabajoPage() {
  const session = await getSession()
  if (!session || !can(session, 'ordenes.ver')) redirect('/')

  // Vista global (todas las regiones y plantas): el backend devuelve la carga
  // completa para roles cross-plant. Solo lectura — sin inspectores para asignar
  // y sin permisos de asignar/documentos para este rol.
  const orders = await getCargaDeTrabajoData(session.accessToken)

  return (
    <CargaDeTrabajoPage
      orders={orders}
      inspectors={[]}
      rol={session.rol}
      permisos={session.permisos}
    />
  )
}
