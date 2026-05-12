'use client'

import { useState } from 'react'

type Props = {
  value: string
  onChange: (v: string) => void
  options: { id: string; name: string }[]
  placeholder: string
  compact?: boolean
}

export default function EmployeeSelectModal({ value, onChange, options, placeholder, compact = false }: Props) {
  const [open, setOpen] = useState(false)
  const selected = options.find((o) => o.id === value)

  const handleSelect = (id: string) => {
    onChange(id)
    setOpen(false)
  }

  return (
    <>
      {compact ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-1.5 active:scale-95 transition-all whitespace-nowrap"
          style={{
            background: '#ffffff',
            color: selected ? '#b8963e' : '#9ca3af',
            border: `1.5px solid ${selected ? '#e8dcc3' : '#e5e7eb'}`,
          }}
        >
          <span className="truncate max-w-[140px]">{selected ? selected.name : placeholder}</span>
          <svg width="14" height="14" viewBox="0 0 18 18" fill="currentColor" className="flex-shrink-0">
            <path d="M4 7l5 5 5-5z" />
          </svg>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full px-5 py-4 text-lg font-medium rounded-xl focus:outline-none cursor-pointer text-left flex items-center justify-between active:scale-[0.99] transition-transform"
          style={{
            background: '#ffffff',
            color: selected ? '#1f2937' : '#9ca3af',
            border: '1.5px solid #e5e7eb',
          }}
        >
          <span className="truncate">{selected ? selected.name : placeholder}</span>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="#9ca3af" className="flex-shrink-0 ml-2">
            <path d="M4 7l5 5 5-5z" />
          </svg>
        </button>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={() => setOpen(false)}
          style={{
            background: 'rgba(0,0,0,0.3)',
            backdropFilter: 'blur(8px)',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="rounded-3xl p-6 max-w-2xl w-full mx-4 shadow-2xl flex flex-col"
            style={{ background: '#ffffff', animation: 'slideUp 0.25s ease', maxHeight: '80vh' }}
          >
            <p className="text-lg font-bold mb-4 px-2" style={{ color: '#1f2937' }}>
              担当氏名を選択
            </p>

            <div className="overflow-y-auto flex-1" style={{ maxHeight: '60vh' }}>
              {options.length === 0 ? (
                <p className="text-center py-8 text-base" style={{ color: '#9ca3af' }}>
                  選択肢がありません
                </p>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {options.map((o) => {
                    const isActive = o.id === value
                    return (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() => handleSelect(o.id)}
                        className="w-full py-4 px-3 rounded-xl text-lg font-semibold text-center active:scale-[0.98] transition-all truncate"
                        style={
                          isActive
                            ? {
                                background: '#b8963e',
                                color: '#fff',
                                boxShadow: '0 2px 12px rgba(184,150,62,0.3)',
                              }
                            : {
                                background: '#ffffff',
                                color: '#1f2937',
                                border: '1.5px solid #e5e7eb',
                              }
                        }
                      >
                        {o.name}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-4 w-full py-4 rounded-xl text-base font-bold"
              style={{ background: '#f3f4f6', color: '#6b7280' }}
            >
              キャンセル
            </button>
          </div>
        </div>
      )}
    </>
  )
}
