'use client'

import { useState, useMemo } from 'react'

type DatePickerProps = {
  value: string // 'YYYY-MM-DD'
  onChange: (v: string) => void
  placeholder?: string
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function toStr(y: number, m: number, d: number) {
  return `${y}-${pad(m)}-${pad(d)}`
}

function formatDisplay(dateStr: string) {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-')
  return `${y}/${m}/${d}`
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

export default function DatePicker({ value, onChange, placeholder = '日付を選択' }: DatePickerProps) {
  const [open, setOpen] = useState(false)

  const today = useMemo(() => {
    const d = new Date()
    return toStr(d.getFullYear(), d.getMonth() + 1, d.getDate())
  }, [])

  // カレンダー表示月
  const initial = value || today
  const [viewYear, setViewYear] = useState(() => parseInt(initial.split('-')[0]))
  const [viewMonth, setViewMonth] = useState(() => parseInt(initial.split('-')[1]))

  const prevMonth = () => {
    if (viewMonth === 1) { setViewYear(viewYear - 1); setViewMonth(12) }
    else setViewMonth(viewMonth - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 12) { setViewYear(viewYear + 1); setViewMonth(1) }
    else setViewMonth(viewMonth + 1)
  }

  // カレンダーのグリッドデータ
  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth - 1, 1).getDay()
    const lastDate = new Date(viewYear, viewMonth, 0).getDate()
    const prevLastDate = new Date(viewYear, viewMonth - 1, 0).getDate()

    const days: { day: number; month: 'prev' | 'current' | 'next'; dateStr: string; dow: number }[] = []

    // 前月の末尾
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = prevLastDate - i
      const m = viewMonth === 1 ? 12 : viewMonth - 1
      const y = viewMonth === 1 ? viewYear - 1 : viewYear
      days.push({ day: d, month: 'prev', dateStr: toStr(y, m, d), dow: days.length % 7 })
    }

    // 当月
    for (let d = 1; d <= lastDate; d++) {
      days.push({ day: d, month: 'current', dateStr: toStr(viewYear, viewMonth, d), dow: days.length % 7 })
    }

    // 次月の先頭（6行=42マスに揃える）
    const remaining = 42 - days.length
    for (let d = 1; d <= remaining; d++) {
      const m = viewMonth === 12 ? 1 : viewMonth + 1
      const y = viewMonth === 12 ? viewYear + 1 : viewYear
      days.push({ day: d, month: 'next', dateStr: toStr(y, m, d), dow: days.length % 7 })
    }

    return days
  }, [viewYear, viewMonth])

  const selectDate = (dateStr: string) => {
    onChange(dateStr)
    setOpen(false)
  }

  const handleOpen = () => {
    // 開く時に選択中の日付の月を表示
    const target = value || today
    setViewYear(parseInt(target.split('-')[0]))
    setViewMonth(parseInt(target.split('-')[1]))
    setOpen(true)
  }

  return (
    <>
      {/* トリガーボタン */}
      <button
        type="button"
        onClick={handleOpen}
        className="w-full px-5 py-4 text-lg rounded-xl text-left focus:outline-none"
        style={{
          background: '#ffffff',
          color: value ? '#1f2937' : '#9ca3af',
          border: '1.5px solid #e5e7eb',
          fontFamily: value ? "'DM Mono', monospace" : 'inherit',
        }}
      >
        {value ? formatDisplay(value) : placeholder}
      </button>

      {/* モーダル */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={() => setOpen(false)}
          style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(8px)', animation: 'fadeIn 0.2s ease' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="rounded-3xl p-6 shadow-2xl"
            style={{ background: '#ffffff', minWidth: '360px', animation: 'slideUp 0.25s ease' }}
          >
            {/* ヘッダー: 月送り */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={prevMonth}
                className="flex items-center justify-center w-12 h-12 rounded-xl text-xl font-bold active:scale-90 transition-transform"
                style={{ background: '#f3f4f6', color: '#6b7280' }}
              >
                ◀
              </button>
              <span
                className="text-xl font-bold"
                style={{ color: '#1f2937', fontFamily: "'DM Mono', monospace" }}
              >
                {viewYear}年{viewMonth}月
              </span>
              <button
                onClick={nextMonth}
                className="flex items-center justify-center w-12 h-12 rounded-xl text-xl font-bold active:scale-90 transition-transform"
                style={{ background: '#f3f4f6', color: '#6b7280' }}
              >
                ▶
              </button>
            </div>

            {/* 曜日ヘッダー */}
            <div className="grid grid-cols-7 mb-1">
              {WEEKDAYS.map((wd, i) => (
                <div
                  key={wd}
                  className="text-center text-sm font-bold py-2"
                  style={{
                    color: i === 0 ? '#dc2626' : i === 6 ? '#2563eb' : '#9ca3af',
                  }}
                >
                  {wd}
                </div>
              ))}
            </div>

            {/* 日付グリッド */}
            <div className="grid grid-cols-7">
              {calendarDays.map((cell, idx) => {
                const isToday = cell.dateStr === today
                const isSelected = cell.dateStr === value
                const isCurrent = cell.month === 'current'

                let textColor = '#1f2937'
                if (!isCurrent) textColor = '#d1d5db'
                else if (cell.dow === 0) textColor = '#dc2626'
                else if (cell.dow === 6) textColor = '#2563eb'

                return (
                  <button
                    key={idx}
                    onClick={() => selectDate(cell.dateStr)}
                    className="flex items-center justify-center rounded-xl font-semibold transition-all active:scale-90"
                    style={{
                      width: '48px',
                      height: '48px',
                      fontSize: '16px',
                      background: isSelected ? '#b8963e' : 'transparent',
                      color: isSelected ? '#ffffff' : textColor,
                      boxShadow: isSelected ? '0 2px 8px rgba(184,150,62,0.3)' : 'none',
                      border: isToday && !isSelected ? '2px solid #b8963e' : '2px solid transparent',
                    }}
                  >
                    {cell.day}
                  </button>
                )
              })}
            </div>

            {/* 今日ボタン */}
            <div className="mt-4 flex justify-center">
              <button
                onClick={() => selectDate(today)}
                className="px-6 py-2.5 rounded-xl text-sm font-bold active:scale-95 transition-all"
                style={{ background: '#faf6ed', color: '#b8963e', border: '1px solid #e8dcc3' }}
              >
                今日
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
