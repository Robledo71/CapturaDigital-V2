import { SideBar } from '@/front/components/admin/SideBar'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-blue-50/50 dark:bg-[#070e1a]">
      <SideBar />
      <div className="flex-1 flex flex-col overflow-hidden">{children}</div>
    </div>
  )
}
