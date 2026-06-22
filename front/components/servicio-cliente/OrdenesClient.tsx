'use client'

import { useState } from 'react'
import type { PublishedReporteRow, PublishedReportesStats } from '@/back/services/publishedReportesService'
import { ReportesPublicadosClient } from '@/front/components/capturacion/ReportesPublicadosClient'
import { ReporteDetalleModal } from './ReporteDetalleModal'

interface OrdenesClientProps {
  stats: PublishedReportesStats
  rows: PublishedReporteRow[]
  canDescargar: boolean
}

export function OrdenesClient({ stats, rows, canDescargar }: OrdenesClientProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  return (
    <>
      <ReportesPublicadosClient
        stats={stats}
        rows={rows}
        title="Servicio al Cliente · Órdenes"
        subtitle="Consulta el detalle de cada reporte publicado"
        onRowClick={(row) => setSelectedId(row.id)}
        canDescargar={canDescargar}
      />
      <ReporteDetalleModal reporteId={selectedId} onClose={() => setSelectedId(null)} />
    </>
  )
}
