'use client'

type SliderInputProps = {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
  unit?: string
  decimal?: number
  size?: 'default' | 'compact'
}

export default function SliderInput({
  value,
  onChange,
  min = 0,
  max = 12,
  step = 0.5,
  unit = 'h',
  decimal = 1,
  size = 'default',
}: SliderInputProps) {
  const pct = ((value - min) / (max - min)) * 100
  const isCompact = size === 'compact'

  return (
    <div>
      <div className="text-center mb-2">
        <span
          className={`${isCompact ? 'text-xl' : 'text-5xl'} font-bold`}
          style={{ color: '#b8963e', fontFamily: "'DM Mono', monospace" }}
        >
          {decimal > 0 ? value.toFixed(decimal) : value}
        </span>
        <span className={`${isCompact ? 'text-xs' : 'text-lg'} ml-1`} style={{ color: '#9ca3af' }}>
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full"
        style={{
          background: `linear-gradient(to right, #b8963e ${pct}%, #e5e7eb ${pct}%)`,
          height: '6px',
          borderRadius: '3px',
        }}
      />
      <div className="flex justify-between mt-2 text-xs" style={{ color: '#9ca3af' }}>
        {[0, 0.25, 0.5, 0.75, 1].map((r) => (
          <span key={r}>{Math.round(min + (max - min) * r)}</span>
        ))}
      </div>
    </div>
  )
}
