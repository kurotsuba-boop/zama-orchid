'use client'

type ChipProps = {
  label: string
  active: boolean
  onClick: () => void
  size?: 'md' | 'lg'
}

export default function Chip({ label, active, onClick, size = 'md' }: ChipProps) {
  const pad = size === 'lg' ? 'px-5 py-3 text-base' : 'px-3 py-2 text-sm'

  return (
    <button
      onClick={onClick}
      className={`${pad} rounded-xl font-semibold transition-all active:scale-95`}
      style={
        active
          ? { background: '#b8963e', color: '#fff', boxShadow: '0 2px 12px rgba(184,150,62,0.3)' }
          : { background: '#ffffff', color: '#4b5563', border: '1.5px solid #e5e7eb' }
      }
    >
      {label}
    </button>
  )
}
