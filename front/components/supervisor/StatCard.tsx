interface StatCardProps {
  label: string
  value: string
  subtitle: string
  dotColor: 'yellow' | 'blue' | 'green' | 'none'
  chart?: boolean
}

const DOT_CLASSES: Record<StatCardProps['dotColor'], string> = {
  yellow: 'bg-yellow-400',
  blue: 'bg-blue-400',
  green: 'bg-green-400',
  none: '',
}

const BAR_HEIGHTS = ['40%', '55%', '35%', '70%', '45%', '80%', '60%']

export function StatCard({ label, value, subtitle, dotColor, chart }: StatCardProps) {
  return (
    <div className="rounded-xl bg-white p-5 flex flex-col gap-3 border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] dark:bg-[#0f2038] dark:border-[#1a2d4d] dark:shadow-none transition-shadow hover:shadow-[0_4px_25px_-4px_rgba(0,0,0,0.1)]">
      {/* Label row */}
      <div className="flex items-center gap-2">
        {dotColor !== 'none' && (
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${DOT_CLASSES[dotColor]}`} />
        )}
        <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
      </div>

      {/* Value */}
      <p className="text-3xl font-bold text-slate-900 dark:text-white leading-none">{value}</p>

      {/* Subtitle or chart */}
      {chart ? (
        <div className="flex items-end gap-1 h-10" aria-hidden="true">
          {BAR_HEIGHTS.map((height, i) => (
            <div
              key={i}
              className="flex-1 bg-blue-600 rounded-sm"
              style={{ height }}
            />
          ))}
        </div>
      ) : (
        subtitle && <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
      )}
    </div>
  )
}