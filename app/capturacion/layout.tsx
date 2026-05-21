import { Sidebar } from '@/front/components/capturacion/Sidebar'

export default function CapturacionLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-blue-50/50 dark:bg-[#070e1a]">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">{children}</div>
    </div>
  )
}
