'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Header, { type TabDef } from './Header'
import WorkReport from './WorkReport'
import LossReport from './LossReport'
import TimecardView from './TimecardView'
import AnalyticsView from './AnalyticsView'
import MyAnalytics from './MyAnalytics'
import { useUserRole } from '@/hooks/useUserRole'

const USER_TABS: TabDef[] = [
  { id: 'work', label: '作業報告', icon: '📋' },
  { id: 'loss', label: 'ロス報告', icon: '⚠️' },
  { id: 'timecard', label: 'タイムカード', icon: '⏰' },
  { id: 'my_analytics', label: '作業状況', icon: '📊' },
]

const ADMIN_TABS: TabDef[] = [
  { id: 'analytics', label: '分析', icon: '📊' },
  { id: 'settings', label: '設定', icon: '⚙️' },
]

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { role, loading } = useUserRole()
  const isLogin = pathname === '/login'
  const isAdmin = pathname === '/admin'

  const [activeTab, setActiveTab] = useState<string>('work')

  // role が判明したらデフォルトタブを切り替え
  useEffect(() => {
    if (!role) return
    if (role === 'admin') setActiveTab('analytics')
    else setActiveTab('work')
  }, [role])

  // user role が /admin に来たら / に追い出す
  useEffect(() => {
    if (loading) return
    if (isAdmin && role === 'user') {
      router.replace('/')
    }
  }, [loading, isAdmin, role, router])

  if (isLogin) {
    return <>{children}</>
  }

  // role 取得中
  if (loading || !role) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: '#fafaf8' }}>
        <p className="text-sm" style={{ color: '#9ca3af' }}>読み込み中...</p>
      </div>
    )
  }

  const tabs = role === 'admin' ? ADMIN_TABS : USER_TABS

  const handleTabChange = (tabId: string) => {
    // 「設定」タブは /admin へ遷移
    if (role === 'admin' && tabId === 'settings') {
      if (!isAdmin) router.push('/admin')
      return
    }
    // /admin から他タブに移る場合は / へ戻してから state を切り替え
    if (isAdmin) {
      setActiveTab(tabId)
      router.push('/')
      return
    }
    setActiveTab(tabId)
  }

  // /admin にいる時の active タブ表示
  const headerActiveTab = isAdmin ? 'settings' : activeTab

  // /admin ルート: ヘッダー + children (admin page content)
  if (isAdmin) {
    // user role なら何も描画しない（redirect 中）
    if (role !== 'admin') return null
    return (
      <div className="h-screen flex flex-col overflow-hidden" style={{ background: '#fafaf8' }}>
        <Header
          tabs={tabs}
          activeTab={headerActiveTab}
          onTabChange={handleTabChange}
          showSettings={false}
        />
        <div className="flex-1 px-6 py-4 overflow-hidden">{children}</div>
      </div>
    )
  }

  // メイン: state ベースのタブ切替
  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: '#fafaf8' }}>
      <Header
        tabs={tabs}
        activeTab={headerActiveTab}
        onTabChange={handleTabChange}
        showSettings={false}
      />
      <div className="flex-1 px-6 py-4 overflow-hidden">
        {role === 'admin' ? (
          <div style={{ display: activeTab === 'analytics' ? 'block' : 'none', height: '100%' }}>
            <AnalyticsView />
          </div>
        ) : (
          <>
            <div style={{ display: activeTab === 'work' ? 'block' : 'none', height: '100%' }}>
              <WorkReport />
            </div>
            <div style={{ display: activeTab === 'loss' ? 'block' : 'none', height: '100%' }}>
              <LossReport />
            </div>
            <div style={{ display: activeTab === 'timecard' ? 'block' : 'none', height: '100%' }}>
              <TimecardView />
            </div>
            <div style={{ display: activeTab === 'my_analytics' ? 'block' : 'none', height: '100%' }}>
              <MyAnalytics />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
