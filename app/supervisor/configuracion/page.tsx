import { redirect } from 'next/navigation'
import { getSession } from '@/back/services/session'
import { canAny } from '@/front/lib/permisos'
import { getSignatureStatus } from '@/back/services/signatureService'
import { TopBar } from '@/front/components/supervisor/TopBar'
import { MiFirmaConfig } from '@/front/components/configuracion/MiFirmaConfig'
import { AccesoRestringido } from '@/front/components/ui/AccesoRestringido'

export const metadata = {
  title: 'Configuración — Captura Digital',
}

export default async function SupervisorConfiguracionPage() {
  const session = await getSession()
  if (!session) redirect('/')

  if (!canAny(session, ['reportes.firmar', 'reportes_informales.firmar'])) {
    return (
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar crumb="Configuración" />
        <AccesoRestringido mensaje="No tienes permiso para acceder a la configuración." />
      </div>
    )
  }

  const { hasSignature } = await getSignatureStatus(session.accessToken)

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar crumb="Configuración" />
      <div className="flex-1 overflow-y-auto">
        <MiFirmaConfig hasSignatureInicial={hasSignature} />
      </div>
    </div>
  )
}
