'use client'

import { usePathname } from 'next/navigation'
import Header from './Header'

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLogin = pathname === '/login'

  if (isLogin) {
    return <>{children}</>
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: '#fafaf8' }}>
      <Header />
      <div className="flex-1 px-8 py-5 overflow-hidden">{children}</div>
    </div>
  )
}
