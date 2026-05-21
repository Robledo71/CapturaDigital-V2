'use client'

interface ButtonProps {
  children: React.ReactNode
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
  pending?: boolean
  onClick?: () => void
  className?: string
}

export function Button({ children, type = 'button', disabled, pending, onClick, className = '' }: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || pending}
      onClick={onClick}
      className={`relative flex w-full items-center justify-center rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 py-3 text-sm font-semibold text-blue-950 dark:text-white transition-all hover:from-blue-500 hover:to-blue-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {pending ? (
        <>
          <svg className="mr-2 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Iniciando...
        </>
      ) : (
        children
      )}
    </button>
  )
}
