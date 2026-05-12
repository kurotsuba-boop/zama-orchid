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
import { useEmployees } from '@/hooks/useEmployees'

const USER_TABS: TabDef[] = [
  { id: 'work', label: '作業報告', icon: '📋' },
  { id: 'loss', label: 'ロス報告', icon: '⚠️' },
  { id: 'timecard', label: 'タイムカード', icon: '⏰' },
  { id: 'my_analytics', label: '作業状況', icon: '📊' },
]

const ADMIN_TABS: TabDef[] = [
  { id: 'work', label: '作業報告', icon: '📋' },
  { id: 'loss', label: 'ロス報告', icon: '⚠️' },
  { id: 'timecard', label: 'タイムカード', icon: '⏰' },
  { id: 'analytics', label: '分析', icon: '📊' },
  { id: 'settings', label: '設定', icon: '⚙️' },
]

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { role, loading } = useUserRole()
  const { employees } = useEmployees()
  const isLogin = pathname === '/login'
  const isAdmin = pathname === '/admin'

  const [activeTab, setActiveTab] = useState<string>('work')
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('')

  useEffect(() => {
    if (!role) return
    if (role === 'admin') setActiveTab('analytics')
    else setActiveTab('work')
  }, [role])

  useEffect(() => {
    if (loading) return
    if (isAdmin && role === 'user') {
      router.replace('/')
    }
  }, [loading, isAdmin, role, router])

  if (isLogin) {
    return <>{children}</>
  }

  if (loading || !role) {
    return (
      <div
        className="flex items-center justify-center"
        style={{
          background: '#fafaf8',
          height: 'calc(100dvh - env(safe-area-inset-bottom))',
        }}
      >
        <p className="text-sm" style={{ color: '#9ca3af' }}>読み込み中...</p>
      </div>
    )
  }

  const tabs = role === 'admin' ? ADMIN_TABS : USER_TABS

  const handleTabChange = (tabId: string) => {
    if (role === 'admin' && tabId === 'settings') {
      if (!isAdmin) router.push('/admin')
      return
    }
    if (isAdmin) {
      setActiveTab(tabId)
      router.push('/')
      return
    }
    setActiveTab(tabId)
  }

  const headerActiveTab = isAdmin ? 'settings' : activeTab

  // admin / user 両方でヘッダーに従業員セレクター表示
  const headerEmpProps = {
    employees: employees.map((e) => ({ id: e.id, name: e.name })),
    selectedEmployeeId,
    onEmployeeChange: setSelectedEmployeeId,
  }

  if (isAdmin) {
    if (role !== 'admin') return null
    return (
      <div
        className="flex flex-col overflow-hidden"
        style={{
          background: '#fafaf8',
          height: 'calc(100dvh - env(safe-area-inset-bottom))',
        }}
      >
        <Header
          tabs={tabs}
          activeTab={headerActiveTab}
          onTabChange={handleTabChange}
          showSettings={false}
          {...headerEmpProps}
        />
        <div className="flex-1 px-6 py-4 overflow-hidden">{children}</div>
      </div>
    )
  }

  return (
    <div
      className="flex flex-col overflow-hidden"
      style={{
        background: '#fafaf8',
        height: 'calc(100dvh - env(safe-area-inset-bottom))',
      }}
    >
      <Header
        tabs={tabs}
        activeTab={headerActiveTab}
        onTabChange={handleTabChange}
        showSettings={false}
        {...headerEmpProps}
      />
      <div className="flex-1 px-6 py-4 overflow-hidden">
        {/* 入力系タブ: admin/user共通 */}
        <div style={{ display: activeTab === 'work' ? 'block' : 'none', height: '100%' }}>
          <WorkReport
            employeeId={selectedEmployeeId}
            onResetEmployee={() => setSelectedEmployeeId('')}
          />
        </div>
        <div style={{ display: activeTab === 'loss' ? 'block' : 'none', height: '100%' }}>
          <LossReport
            employeeId={selectedEmployeeId}
            onResetEmployee={() => setSelectedEmployeeId('')}
          />
        </div>
        <div style={{ display: activeTab === 'timecard' ? 'block' : 'none', height: '100%' }}>
          <TimecardView employeeId={selectedEmployeeId} />
        </div>
        {/* role別の分析タブ */}
        {role === 'admin' && (
          <div style={{ display: activeTab === 'analytics' ? 'block' : 'none', height: '100%' }}>
            <AnalyticsView />
          </div>
        )}
        {role === 'user' && (
          <div style={{ display: activeTab === 'my_analytics' ? 'block' : 'none', height: '100%' }}>
            <MyAnalytics employeeId={selectedEmployeeId} />
          </div>
        )}
      </div>
    </div>
  )
}
