'use client'

interface Props {
  label: string
  value: string | number
  selected?: boolean
  onClick?: () => void
}

export function StatCard({ label, value, selected, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className={`
        flex flex-col items-start px-6 py-4 border-b-2 transition-colors w-full text-left
        ${selected
          ? 'border-accent text-accent'
          : 'border-transparent text-gray-500 hover:text-gray-700'}
      `}
    >
      <span className="text-xs font-medium uppercase tracking-wider mb-1">{label}</span>
      <span className={`text-2xl font-semibold ${selected ? 'text-accent' : 'text-gray-800'}`}>
        {value}
      </span>
    </button>
  )
}
