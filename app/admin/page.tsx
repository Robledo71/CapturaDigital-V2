import { redirect } from 'next/navigation'
import { TopBar } from '@/front/components/admin/TopBar'
import { DashboardPage } from '@/front/components/admin/DashboardPage'
import { getAdminDashboardData } from '@/back/services/adminDashboardService'
import { getSession } from '@/back/services/session'

export default async function AdminPage() {
  const session = await getSession()
  if (!session) redirect('/')

  const { stats, recentUsuarios } = await getAdminDashboardData(session.accessToken)

  return (
    <>
      <TopBar />
      <DashboardPage stats={stats} recentUsuarios={recentUsuarios} />
    </>
  )
}
