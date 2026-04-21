'use client'

type SliderInputProps = {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
  unit?: string
  decimal?: number
  size?: 'default' | 'compact' | 'medium' | 'large'
  showTicks?: boolean
  tight?: boolean
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
  showTicks = true,
  tight = false,
}: SliderInputProps) {
  const pct = ((value - min) / (max - min)) * 100
  const valueCls = size === 'compact' ? 'text-xl'
    : size === 'medium' ? 'text-3xl'
    : size === 'large' ? 'text-6xl'
    : 'text-5xl'
  const unitCls = size === 'compact' ? 'text-xs'
    : size === 'medium' ? 'text-sm'
    : size === 'large' ? 'text-xl'
    : 'text-lg'

  return (
    <div>
      <div className={`text-center ${tight ? 'mb-1' : 'mb-2'}`}>
        <span
          className={`${valueCls} font-bold`}
          style={{ color: '#b8963e', fontFamily: "'DM Mono', monospace" }}
        >
          {decimal > 0 ? value.toFixed(decimal) : value}
        </span>
        <span className={`${unitCls} ml-1`} style={{ color: '#9ca3af' }}>
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
      {showTicks && (
        <div className="flex justify-between mt-2 text-xs" style={{ color: '#9ca3af' }}>
          {[0, 0.25, 0.5, 0.75, 1].map((r) => (
            <span key={r}>{Math.round(min + (max - min) * r)}</span>
          ))}
        </div>
      )}
    </div>
  )
}
