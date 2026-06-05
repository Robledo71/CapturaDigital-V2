import { redirect } from 'next/navigation'
import { TabletPage } from "@/front/components/supervisor/TabletPage";
import { TopBar } from "@/front/components/supervisor/TopBar";
import { AutoRefresh } from "@/front/components/supervisor/AutoRefresh";
import { getSession } from '@/back/services/session'
import { getSupervisorTablets } from '@/back/services/tabletService'

export const metadata = {
    title: 'Control de Tablets - Captura Digital',
}

export default async function TabletsRoute() {
    const session = await getSession()
    if (!session) redirect('/')
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