'use client'

interface FilterChipItem {
  key: string
  label: string
  count: number
}

interface FilterChipsProps {
  items: FilterChipItem[]
  activeKey: string
  onChange: (key: string) => void
}

export function FilterChips({ items, activeKey, onChange }: FilterChipsProps) {
  return (
    <div role="tablist" aria-label="Filtrar por estatus" className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
      {items.map((item) => {
        const isActive = activeKey === item.key
        return (
          <button
            key={item.key}
            role="tab"
            aria-selected={isActive}
            type="button"
            onClick={() => onChange(item.key)}
            className={`rounded-full px-3 min-h-11 flex items-center gap-1.5 text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
              isActive ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-[#1a2d4d] dark:text-slate-300'
            }`}
          >
            {item.label}
            <span
              className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                isActive
                  ? 'bg-slate-100 dark:bg-blue-500/20 text-slate-700 dark:text-blue-300'
                  : 'bg-slate-100 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400'
              }`}
            >
              {item.count}
            </span>
          </button>
        )
      })}
    </div>
  )
}
