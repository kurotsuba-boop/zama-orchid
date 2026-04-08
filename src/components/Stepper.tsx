'use client'

import { useRef, useEffect, useCallback } from 'react'

type StepperProps = {
  value: number
  onChange: (v: number) => void
}

export default function Stepper({ value, onChange }: StepperProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const valueRef = useRef(value)

  // 最新の value を ref に同期
  useEffect(() => {
    valueRef.current = value
  }, [value])

  const stopRepeat = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (intervalRef.current) clearInterval(intervalRef.current)
    timerRef.current = null
    intervalRef.current = null
  }, [])

  const handlePointerDown = useCallback(
    (delta: number) => {
      timerRef.current = setTimeout(() => {
        intervalRef.current = setInterval(() => {
          const next = Math.max(0, valueRef.current + delta)
          valueRef.current = next
          onChange(next)
        }, 100)
      }, 400)
    },
    [onChange]
  )

  const decrement = () => onChange(Math.max(0, value - 1))
  const increment = () => onChange(value + 1)

  return (
    <div className="flex items-center gap-2">
      <button
        onPointerDown={() => handlePointerDown(-1)}
        onPointerUp={stopRepeat}
        onPointerLeave={stopRepeat}
        onClick={decrement}
        className="flex items-center justify-center rounded-xl font-bold text-2xl select-none active:scale-90 transition-transform"
        style={{
          width: '44px',
          height: '44px',
          background: '#f3f4f6',
          color: value > 0 ? '#6b7280' : '#d1d5db',
          border: '1.5px solid #e5e7eb',
        }}
      >
        −
      </button>
      <span
        className="w-10 text-center text-xl font-bold select-none"
        style={{ color: value > 0 ? '#1f2937' : '#d1d5db', fontFamily: "'DM Mono', monospace" }}
      >
        {value}
      </span>
      <button
        onPointerDown={() => handlePointerDown(1)}
        onPointerUp={stopRepeat}
        onPointerLeave={stopRepeat}
        onClick={increment}
        className="flex items-center justify-center rounded-xl font-bold text-2xl select-none active:scale-90 transition-transform"
        style={{
          width: '44px',
          height: '44px',
          background: '#faf6ed',
          color: '#b8963e',
          border: '1.5px solid #e8dcc3',
        }}
      >
        +
      </button>
    </div>
  )
}
