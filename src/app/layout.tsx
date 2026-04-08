import type { Metadata } from 'next'
import './globals.css'
import LayoutShell from '@/components/LayoutShell'

export const metadata: Metadata = {
  title: '座間洋ランセンター 作業管理',
  description: '座間洋ランセンター 作業管理システム',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ja">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <LayoutShell>{children}</LayoutShell>
      </body>
    </html>
  )
}
