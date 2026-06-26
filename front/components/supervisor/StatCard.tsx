interface StatCardProps {
  label: string
  value: string
  subtitle: string
  dotColor: 'yellow' | 'blue' | 'green' | 'none'
  chart?: boolean
}

const DOT_CLASSES: Record<StatCardProps['dotColor'], string> = {
  yellow: 'bg-yellow-400',
  blue:   'bg-blue-400',
  green:  'bg-green-400',
  none:   '',
}

// Heights and matching opacity suffixes for the gradient-opacity bars
const BAR_HEIGHTS   = ['40%', '55%', '35%', '70%', '45%', '80%', '60%']
const BAR_OPACITIES = [
  'bg-blue-600/30',
  'bg-blue-600/50',
  'bg-blue-600/70',
  'bg-blue-600',
  'bg-blue-600/80',
  'bg-blue-600',
  'bg-blue-600/60',
]

export function StatCard({ label, value, subtitle, dotColor, chart }: StatCardProps) {
  return (
    <div className="rounded-xl bg-white p-5 flex flex-col gap-3 border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] dark:bg-[#0f2038] dark:border-[#0f2038] dark:shadow-none transition-all duration-200 hover:shadow-lg hover:scale-[1.02]">

      {/* Label row */}
      <div className="flex items-center gap-2">
        {dotColor !== 'none' && (
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${DOT_CLASSES[dotColor]}`} />
        )}
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {label}
        </span>
      </div>

      {/* Value */}
      <p className={`font-bold text-slate-900 dark:text-white leading-none ${chart ? 'text-2xl' : 'text-4xl'}`}>
        {value}
      </p>

      {/* Subtitle or chart */}
      {chart ? (
        <div className="flex items-end gap-1 h-10" aria-hidden="true">
          {BAR_HEIGHTS.map((height, i) => (
            <div
              key={i}
              className={`flex-1 rounded-sm ${BAR_OPACITIES[i]}`}
              style={{ height }}
            />
          ))}
        </div>
      ) : (
        subtitle && (
          <p className="text-[10px] text-slate-500 dark:text-slate-400">{subtitle}</p>
        )
      )}
    </div>
  )
}
