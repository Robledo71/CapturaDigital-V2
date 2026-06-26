type LegacyCsvItem = {
  ng: number | null
  ok: number | null
  scrap: number | null
  inspected: number | null
  recovered: number | null
  date: string
  folio: number | null
  shift: 1 | 2 | 3 | null
  partName: string | null
  partNumber: string | null
  incidentA: number | null
  incidentB: number | null
  incidentC: number | null
  incidentD: number | null
  incidentE: number | null
  incidentF: number | null
  incidentG: number | null
  incidentH: number | null
  incidentI: number | null
  incidentJ: number | null
  incidentK: number | null
  incidentL: number | null
  incidentM: number | null
  incidentN: number | null
  incidentO: number | null
  description: string | null
  inci_tipos?: unknown
}

const MONTH_ES: Record<string, number> = {
  ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5,
  jul: 6, ago: 7, sep: 8, oct: 9, nov: 10, dic: 11,
}

function parseLegacyDate(raw: string): Date | null {
  const parts = raw.toLowerCase().split('-')
  if (parts.length !== 3) return null
  const [day, mon, yr] = parts
  const month = MONTH_ES[mon]
  if (month === undefined) return null
  const year = 2000 + Number(yr)
  return new Date(year, month, Number(day))
}

function formatDate(raw: string): string {
  const d = parseLegacyDate(raw)
  if (!d) return raw
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function shiftLabel(shift: 1 | 2 | 3 | null): string {
  if (shift === 1) return '1'
  if (shift === 2) return '2'
  if (shift === 3) return '3'
  return '—'
}

function sumIncidents(item: LegacyCsvItem): number {
  return [
    item.incidentA, item.incidentB, item.incidentC, item.incidentD,
    item.incidentE, item.incidentF, item.incidentG, item.incidentH,
    item.incidentI, item.incidentJ, item.incidentK, item.incidentL,
    item.incidentM, item.incidentN, item.incidentO,
  ].reduce<number>((acc, v) => acc + (v ?? 0), 0)
}

const HEADERS = [
  'Fecha', 'Folio', 'Turno', '# Parte', 'Nombre Parte',
  'Inspeccionado', 'OK', 'NG', 'Scrap', 'Recuperado', 'Incidencias',
]

export function LegacyCsvTable({ items }: { items: unknown[] }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-[#1a2d4d] dark:bg-[#0c1829]">
      <h2 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">
        Detalle de items (sistema anterior)
      </h2>

      {items.length === 0 ? (
        <p className="text-sm text-slate-500">Sin items registrados.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-[#1a2d4d]">
                {HEADERS.map((h) => (
                  <th
                    key={h}
                    scope="col"
                    className="pb-2 pr-4 text-left text-xs font-bold text-black dark:text-white last:pr-0"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((raw, idx) => {
                const item = raw as LegacyCsvItem
                return (
                  <tr
                    key={idx}
                    className="border-b border-slate-50 last:border-0 dark:border-[#1a2d4d]"
                  >
                    <td className="py-2 pr-4 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {formatDate(item.date)}
                    </td>
                    <td className="py-2 pr-4 text-slate-700 dark:text-slate-300">
                      {item.folio ?? '—'}
                    </td>
                    <td className="py-2 pr-4 text-slate-700 dark:text-slate-300">
                      {shiftLabel(item.shift)}
                    </td>
                    <td className="py-2 pr-4 text-slate-700 dark:text-slate-300">
                      {item.partNumber ?? '—'}
                    </td>
                    <td className="py-2 pr-4 text-slate-700 dark:text-slate-300 max-w-[160px] truncate">
                      {item.partName ?? '—'}
                    </td>
                    <td className="py-2 pr-4 text-right text-slate-700 dark:text-slate-300">
                      {item.inspected ?? '—'}
                    </td>
                    <td className="py-2 pr-4 text-right text-slate-700 dark:text-slate-300">
                      {item.ok ?? '—'}
                    </td>
                    <td className="py-2 pr-4 text-right text-slate-700 dark:text-slate-300">
                      {item.ng ?? '—'}
                    </td>
                    <td className="py-2 pr-4 text-right text-slate-700 dark:text-slate-300">
                      {item.scrap ?? '—'}
                    </td>
                    <td className="py-2 pr-4 text-right text-slate-700 dark:text-slate-300">
                      {item.recovered ?? '—'}
                    </td>
                    <td className="py-2 text-right text-slate-700 dark:text-slate-300">
                      {sumIncidents(item)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
