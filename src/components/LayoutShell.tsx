'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import Header from './Header'
import WorkReport from './WorkReport'
import LossReport from './LossReport'
import TimecardView from './TimecardView'
import AnalyticsView from './AnalyticsView'

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [activeTab, setActiveTab] = useState('work')
  const isLogin = pathname === '/login'
  const isAdmin = pathname === '/admin'

  if (isLogin) {
    return <>{children}</>
  }

  // /admin は従来どおりルーティング
  if (isAdmin) {
    return (
      <div className="h-screen flex flex-col overflow-hidden" style={{ background: '#fafaf8' }}>
        <Header activeTab="" onTabChange={setActiveTab} />
        <div className="flex-1 px-8 py-5 overflow-hidden">{children}</div>
      </div>
    )
  }

  // メインタブはstate切り替え（ルーティングなし）
  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: '#fafaf8' }}>
      <Header activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="flex-1 px-8 py-5 overflow-hidden">
        <div style={{ display: activeTab === 'work' ? 'block' : 'none', height: '100%' }}>
          <WorkReport />
        </div>
        <div style={{ display: activeTab === 'loss' ? 'block' : 'none', height: '100%' }}>
          <LossReport />
        </div>
        <div style={{ display: activeTab === 'timecard' ? 'block' : 'none', height: '100%' }}>
          <TimecardView />
        </div>
        <div style={{ display: activeTab === 'analytics' ? 'block' : 'none', height: '100%' }}>
          <AnalyticsView />
        </div>
      </div>
    </div>
  )
}
