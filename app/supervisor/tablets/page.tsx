import { redirect } from 'next/navigation'
import { TabletPage } from "@/front/components/supervisor/TabletPage";
import { TopBar } from "@/front/components/supervisor/TopBar";
import { AutoRefresh } from "@/front/components/supervisor/AutoRefresh";
import { getSession } from '@/back/services/session'
import { can } from '@/front/lib/permisos'
import { getSupervisorTablets } from '@/back/services/tabletService'
import { AccesoRestringido } from '@/front/components/ui/AccesoRestringido'

export const metadata = {
    title: 'Control de Tablets - Captura Digital',
}

export default async function TabletsRoute() {
    const session = await getSession()
    if (!session) redirect('/')
    if (!can(session, 'tablets.ver')) {
        return (
            <div className="flex flex-col flex-1 overflow-hidden">
                <TopBar crumb="Control de Tablets" />
                <AccesoRestringido mensaje="No tienes permiso para ver las tablets." />
            </div>
        )
    }
    const plantaId = session.rol !== 'admin' ? (session.plantaId ?? null) : null
    const tablets = await getSupervisorTablets(session.accessToken, plantaId)

    return (
        <div className="flex flex-col flex-1 overflow-hidden">
            <TopBar crumb="Control de Tablets"/>
            <TabletPage tablets={tablets} />
            <AutoRefresh />
        </div>
    )
}