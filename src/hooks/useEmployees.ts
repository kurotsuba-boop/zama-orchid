'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import type { Employee } from '@/lib/types'

// 改修(2026-06-23): 「マウント時1回だけ取得」だと、起動直後の通信失敗 / トークン更新の隙に
// 空配列([])が返った場合に担当者リストが空のまま固まり、再読込するまで復帰しなかった
// （iPadキオスクで「たまに名前を押すと誰もいない」現象）。
// → 失敗時リトライ + ログイン状態変化/画面復帰で空なら取り直し + 手動 refetch を追加して自動回復させる。
// 初代の実装は git 履歴を参照。

type SupabaseLikeError = { code?: string; message?: string; status?: number } | null

const isAuthError = (err: SupabaseLikeError): boolean => {
  if (!err) return false
  if (err.code === 'PGRST301') return true
  if (err.status === 401) return true
  const msg = (err.message || '').toLowerCase()
  return msg.includes('jwt') || msg.includes('expired') || msg.includes('invalid token')
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export function useEmployees() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const mountedRef = useRef(true)
  const inFlightRef = useRef(false) // 同一インスタンスの多重取得を防ぐ
  const countRef = useRef(0)        // 現在保持している件数（0なら復帰イベントで取り直す）

  const fetchEmployees = useCallback(async () => {
    if (inFlightRef.current) return
    inFlightRef.current = true

    // 対策1: 従業員取得は no-store で行い、古いキャッシュ応答を掴まない
    // （新規追加した従業員が反映されない再発への保険）
    const supabase = createClient({ noStore: true })
    const runQuery = () =>
      supabase
        .from('employees')
        .select('*')
        .eq('is_active', true)
        .order('display_order')
        .range(0, 9999)

    if (mountedRef.current) {
      setLoading(true)
      setError(null)
    }

    try {
      // 1. セッション確認（無ければログインへ）
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) console.error('[useEmployees] getSession error:', sessionError)
      if (!sessionData?.session) {
        console.warn('[useEmployees] active session not found — redirecting to /login')
        if (mountedRef.current) {
          setError('セッションが切れました。再ログインしてください。')
          setLoading(false)
        }
        router.replace('/login')
        return
      }

      // 2. クエリ（transient含めて最大3回リトライ。auth系は refreshSession を挟む）
      let data: Employee[] | null = null
      let lastErr: SupabaseLikeError = null
      for (let attempt = 0; attempt < 3; attempt++) {
        const res = await runQuery()
        if (!res.error) {
          data = (res.data as Employee[]) || []
          lastErr = null
          break
        }
        lastErr = res.error
        console.warn(`[useEmployees] query error (attempt ${attempt + 1}/3):`, res.error)

        if (isAuthError(res.error)) {
          const { error: refreshError } = await supabase.auth.refreshSession()
          if (refreshError) {
            console.error('[useEmployees] refreshSession failed:', refreshError)
            if (mountedRef.current) {
              setError('セッションのリフレッシュに失敗しました。再ログインしてください。')
              setLoading(false)
            }
            router.replace('/login')
            return
          }
        }
        await sleep(400 * (attempt + 1)) // バックオフ
      }

      if (lastErr && !data) {
        if (mountedRef.current) {
          setError(lastErr.message || '従業員データの取得に失敗しました')
          setLoading(false)
        }
        return
      }

      countRef.current = data?.length ?? 0
      if (mountedRef.current) {
        setEmployees(data || [])
        setError(null)
        setLoading(false)
      }
    } catch (e: any) {
      console.error('[useEmployees] unexpected error:', e)
      if (mountedRef.current) {
        setError(e?.message || '通信に失敗しました')
        setLoading(false)
      }
    } finally {
      inFlightRef.current = false
    }
  }, [router])

  useEffect(() => {
    mountedRef.current = true
    fetchEmployees()

    const supabase = createClient()
    // ログイン確立 / トークン更新時、まだ空なら取り直す（期限切れ→更新での自動回復）
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && countRef.current === 0) {
        fetchEmployees()
      }
    })

    // 画面復帰 / フォーカス時、空のままなら取り直す（iPadのタブ再読込・スリープ復帰対策）
    const onVisible = () => {
      if (document.visibilityState === 'visible' && countRef.current === 0) fetchEmployees()
    }
    const onFocus = () => {
      if (countRef.current === 0) fetchEmployees()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onFocus)

    return () => {
      mountedRef.current = false
      sub.subscription.unsubscribe()
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onFocus)
    }
  }, [fetchEmployees])

  return { employees, loading, error, refetch: fetchEmployees }
}
