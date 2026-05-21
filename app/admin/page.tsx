import { TopBar } from '@/front/components/admin/TopBar'
import { DashboardPage } from '@/front/components/admin/DashboardPage'
import { getAdminDashboardData } from '@/back/services/adminDashboardService'

export default async function AdminPage() {
  const { stats, recentUsuarios } = await getAdminDashboardData()

  return (
    <>
      <TopBar />
      <DashboardPage stats={stats} recentUsuarios={recentUsuarios} />
    </>
  )
}
