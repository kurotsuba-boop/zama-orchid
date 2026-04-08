'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError('メールアドレスまたはパスワードが正しくありません')
      setLoading(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <div
      className="h-screen flex items-center justify-center"
      style={{ background: '#fafaf8', fontFamily: "'Noto Sans JP', sans-serif" }}
    >
      <div
        className="w-full max-w-sm rounded-3xl p-10 shadow-lg"
        style={{ background: '#ffffff', border: '1px solid #e5e7eb' }}
      >
        <div className="text-center mb-8">
          <p className="text-4xl mb-3">🌸</p>
          <h1 className="text-xl font-bold" style={{ color: '#1f2937' }}>
            座間洋ランセンター
          </h1>
          <p className="text-sm mt-1" style={{ color: '#9ca3af' }}>
            作業管理システム
          </p>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-bold tracking-widest uppercase mb-1 block" style={{ color: '#9ca3af' }}>
              メールアドレス
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              required
              className="w-full px-4 py-3.5 text-base rounded-xl focus:outline-none"
              style={{ background: '#fafaf8', color: '#1f2937', border: '1.5px solid #e5e7eb' }}
            />
          </div>

          <div>
            <label className="text-xs font-bold tracking-widest uppercase mb-1 block" style={{ color: '#9ca3af' }}>
              パスワード
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="パスワードを入力"
              required
              className="w-full px-4 py-3.5 text-base rounded-xl focus:outline-none"
              style={{ background: '#fafaf8', color: '#1f2937', border: '1.5px solid #e5e7eb' }}
            />
          </div>

          {error && (
            <p className="text-sm text-center" style={{ color: '#dc2626' }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-xl text-lg font-bold text-white transition-all active:scale-[0.97] disabled:opacity-50"
            style={{ background: '#b8963e', boxShadow: '0 4px 16px rgba(184,150,62,0.3)' }}
          >
            {loading ? 'ログイン中...' : 'ログイン'}
          </button>
        </form>
      </div>
    </div>
  )
}
