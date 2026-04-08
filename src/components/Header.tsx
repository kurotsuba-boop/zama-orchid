'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'

const TABS = [
  { id: '/', label: '作業報告', icon: '📋' },
  { id: '/loss', label: 'ロス報告', icon: '⚠️' },
  { id: '/timecard', label: 'タイムカード', icon: '⏰' },
  { id: '/analytics', label: '分析', icon: '📊' },
]

export default function Header() {
  const pathname = usePathname()
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
      className="flex items-center justify-between px-8 flex-shrink-0"
      style={{ height: '72px', background: '#ffffff', borderBottom: '1px solid #e5e7eb' }}
    >
      <div className="flex items-center gap-3">
        <span className="text-xl">🌸</span>
        <span className="text-base font-bold tracking-wider" style={{ color: '#1f2937' }}>
          座間洋ランセンター
        </span>
        <span
          className="text-xs px-2 py-0.5 rounded-full font-semibold"
          style={{ background: '#faf6ed', color: '#b8963e', border: '1px solid #e8dcc3' }}
        >
          作業管理
        </span>
      </div>

      <div className="flex items-center gap-2 rounded-2xl p-1.5" style={{ background: '#f5f3ef' }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => router.push(t.id)}
            className="flex items-center gap-2 px-8 py-4 rounded-2xl text-base font-bold transition-all duration-200 active:scale-95"
            style={
              pathname === t.id
                ? { background: '#b8963e', color: '#fff', boxShadow: '0 2px 12px rgba(184,150,62,0.3)' }
                : { background: 'transparent', color: '#9ca3af' }
            }
          >
            <span className="text-lg">{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <div className="text-sm" style={{ color: '#9ca3af', fontFamily: "'DM Mono', monospace" }}>
          {clock}
        </div>
        <button
          onClick={() => router.push('/admin')}
          className="flex items-center justify-center w-9 h-9 rounded-lg transition-all active:scale-90"
          style={{
            background: pathname === '/admin' ? '#faf6ed' : 'transparent',
            border: pathname === '/admin' ? '1px solid #e8dcc3' : '1px solid transparent',
          }}
          title="設定"
        >
          <span className="text-lg">⚙️</span>
        </button>
      </div>
    </div>
  )
}
