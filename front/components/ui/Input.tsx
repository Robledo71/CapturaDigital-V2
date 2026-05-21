interface InputProps {
  id: string
  name: string
  type?: string
  label: string
  placeholder?: string
  error?: string
  autoComplete?: string
  defaultValue?: string
}

export function Input({ id, name, type = 'text', label, placeholder, error, autoComplete, defaultValue }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-blue-700 dark:text-slate-300">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        className={`w-full rounded-lg border px-4 py-3 text-sm text-blue-950 dark:text-white placeholder:text-slate-500 outline-none transition-colors focus:ring-2 focus:ring-blue-500 focus:border-transparent
          ${error
            ? 'border-red-500 bg-[#0b1120]'
            : 'border-[#1e3050] bg-[#0b1120] hover:border-[#2a4070]'
          }`}
      />
      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}
    </div>
  )
}
