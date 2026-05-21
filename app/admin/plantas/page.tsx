import { TopBar } from '@/front/components/admin/TopBar'
import { PlantasPage } from '@/front/components/admin/PlantasPage'
import { getAllPlantas } from '@/back/services/plantService'

const PAGE_SIZE = 20

interface PageProps {
  searchParams: Promise<{ page?: string }>
}

export default async function Page({ searchParams }: PageProps) {
  const { page: pageParam } = await searchParams
  const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1)

  const allPlantas = await getAllPlantas()
  const total = allPlantas.length
  const start = (page - 1) * PAGE_SIZE
  const plantas = allPlantas.slice(start, start + PAGE_SIZE)

  return (
    <>
      <TopBar crumb="Plantas" />
      <PlantasPage
        initialPlantas={plantas}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
      />
    </>
  )
}
