import { TopBar } from '@/front/components/admin/TopBar'
import { DashboardPage } from '@/front/components/admin/DashboardPage'
import { getAdminDashboardData } from '@/back/services/adminDashboardService'
import { getSession } from '@/back/services/session'

export default async function DashboardAdminPage() {
  const session = await getSession()
  const { stats, recentUsuarios } = await getAdminDashboardData(session?.accessToken ?? '')

  return (
    <>
      <TopBar />
      <DashboardPage stats={stats} recentUsuarios={recentUsuarios} />
    </>
  )
}
