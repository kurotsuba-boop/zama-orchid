'use client'

import { useState } from 'react'

type Props = {
  value: string
  onChange: (v: string) => void
  options: { id: string; name: string }[]
  placeholder: string
}

export default function EmployeeSelectModal({ value, onChange, options, placeholder }: Props) {
  const [open, setOpen] = useState(false)
  const selected = options.find((o) => o.id === value)

  const handleSelect = (id: string) => {
    onChange(id)
    setOpen(false)
  }

  return (
    <>
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
            className="rounded-3xl p-6 max-w-md w-full mx-4 shadow-2xl flex flex-col"
            style={{ background: '#ffffff', animation: 'slideUp 0.25s ease', maxHeight: '80vh' }}
          >
            <p className="text-lg font-bold mb-4 px-2" style={{ color: '#1f2937' }}>
              担当氏名を選択
            </p>

            <div className="overflow-y-auto flex-1 flex flex-col gap-2" style={{ maxHeight: '60vh' }}>
              {options.length === 0 ? (
                <p className="text-center py-8 text-base" style={{ color: '#9ca3af' }}>
                  選択肢がありません
                </p>
              ) : (
                options.map((o) => {
                  const isActive = o.id === value
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => handleSelect(o.id)}
                      className="w-full py-4 px-5 rounded-xl text-lg font-semibold text-left active:scale-[0.98] transition-all"
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
                })
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
