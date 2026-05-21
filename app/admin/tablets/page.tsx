import { TopBar } from '@/front/components/admin/TopBar'
import { TabletsPage } from '@/front/components/admin/TabletsPage'
import { getAllTablets } from '@/back/services/tabletService'
import { getAllPlantas } from '@/back/services/plantService'

const PAGE_SIZE = 20

interface PageProps {
  searchParams: Promise<{ page?: string }>
}

export default async function Page({ searchParams }: PageProps) {
  const { page: pageParam } = await searchParams
  const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1)

  const [allTablets, plantas] = await Promise.all([getAllTablets(), getAllPlantas()])
  const total = allTablets.length
  const start = (page - 1) * PAGE_SIZE
  const tablets = allTablets.slice(start, start + PAGE_SIZE)

  return (
    <>
      <TopBar crumb="Tablets" />
      <TabletsPage
        initialTablets={tablets}
        plantas={plantas}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
      />
    </>
  )
}
