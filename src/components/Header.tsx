'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const TABS = [
  { id: 'work', label: '作業報告', icon: '📋' },
  { id: 'loss', label: 'ロス報告', icon: '⚠️' },
  { id: 'timecard', label: 'タイムカード', icon: '⏰' },
  { id: 'analytics', label: '分析', icon: '📊' },
]

type HeaderProps = {
  activeTab: string
  onTabChange: (tab: string) => void
}

export default function Header({ activeTab, onTabChange }: HeaderProps) {
  const router = useRouter()
  const [clock, setClock] = useState('')

  useEffect(() => {
    const tick = () => {
      const d = new Date()
      setClock(
        `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}　${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
      )
    }
    tick()
    const id = setInterval(tick, 30000)
    return () => clearInterval(id)
  }, [])

  return (
    <div
      className="flex items-center justify-between px-6 flex-shrink-0"
      style={{ height: '60px', background: '#ffffff', borderBottom: '1px solid #e5e7eb' }}
    >
      <div className="flex items-center gap-2">
        <span className="text-lg">🌸</span>
        <span className="text-sm font-bold tracking-wider whitespace-nowrap" style={{ color: '#1f2937' }}>
          座間洋ランセンター
        </span>
      </div>

      <div className="flex items-center gap-1 rounded-xl p-1" style={{ background: '#f5f3ef' }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => onTabChange(t.id)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 active:scale-95 whitespace-nowrap"
            style={
              activeTab === t.id
                ? { background: '#b8963e', color: '#fff', boxShadow: '0 2px 12px rgba(184,150,62,0.3)' }
                : { background: 'transparent', color: '#9ca3af' }
            }
          >
            <span className="text-base">{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <div className="text-xs whitespace-nowrap" style={{ color: '#9ca3af', fontFamily: "'DM Mono', monospace" }}>
          {clock}
        </div>
        <button
          onClick={() => router.push('/admin')}
          className="flex items-center justify-center w-8 h-8 rounded-lg transition-all active:scale-90"
          style={{ background: 'transparent', border: '1px solid transparent' }}
          title="設定"
        >
          <span className="text-base">⚙️</span>
        </button>
      </div>
    </div>
  )
}
