'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import type { Employee } from '@/lib/types'

// BEFORE: 認証チェックなし、error を捨てていた、リフレッシュ処理なし
// export function useEmployees() {
//   const [employees, setEmployees] = useState<Employee[]>([])
//   const [loading, setLoading] = useState(true)
//   useEffect(() => {
//     const supabase = createClient()
//     supabase
//       .from('employees')
//       .select('*')
//       .eq('is_active', true)
//       .order('display_order')
//       .range(0, 9999)
//       .then(({ data }) => {
//         if (data) setEmployees(data)
//         setLoading(false)
//       })
//   }, [])
//   return { employees, loading }
// }

type SupabaseLikeError = { code?: string; message?: string; status?: number } | null

const isAuthError = (err: SupabaseLikeError): boolean => {
  if (!err) return false
  if (err.code === 'PGRST301') return true
  if (err.status === 401) return true
  const msg = (err.message || '').toLowerCase()
  return msg.includes('jwt') || msg.includes('expired') || msg.includes('invalid token')
}

export function useEmployees() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    let mounted = true
    const supabase = createClient()

    const runQuery = () =>
      supabase
        .from('employees')
        .select('*')
        .eq('is_active', true)
        .order('display_order')
        .range(0, 9999)

    const fetchEmployees = async () => {
      // 1. 認証セッション確認
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) {
        console.error('[useEmployees] getSession error:', sessionError)
      }
      if (!sessionData?.session) {
        console.warn('[useEmployees] active session not found — redirecting to /login')
        if (mounted) {
          setError('セッションが切れました。再ログインしてください。')
          setLoading(false)
        }
        router.replace('/login')
        return
      }

      // 2. クエリ実行
      let { data, error: queryError } = await runQuery()

      // 3. 認証系エラーなら refreshSession を1回だけ試行
      if (queryError && isAuthError(queryError)) {
        console.warn('[useEmployees] auth error on query, attempting refreshSession:', queryError)
        const { error: refreshError } = await supabase.auth.refreshSession()
        if (refreshError) {
          console.error('[useEmployees] refreshSession failed:', refreshError)
          if (mounted) {
            setError('セッションのリフレッシュに失敗しました。再ログインしてください。')
            setLoading(false)
          }
          router.replace('/login')
          return
        }
        const retry = await runQuery()
        data = retry.data
        queryError = retry.error
      }

      if (queryError) {
        console.error('[useEmployees] query error:', queryError)
        if (mounted) {
          setError(queryError.message || '従業員データの取得に失敗しました')
          setLoading(false)
        }
        return
      }

      if (mounted) {
        setEmployees(data || [])
        setError(null)
        setLoading(false)
      }
    }

    fetchEmployees()

    return () => {
      mounted = false
    }
  }, [router])

  return { employees, loading, error }
}
