'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import type { WorkMaster, LocationMaster, VarietyMaster, LossReasonMaster, PositionMaster } from '@/lib/types'

function useFetch<T>(table: string, filter?: Record<string, any>) {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const supabase = createClient()
    let query = supabase.from(table).select('*').order('display_order')
    if (filter) {
      Object.entries(filter).forEach(([k, v]) => {
        query = query.eq(k, v)
      })
    }
    const { data: rows } = await query.range(0, 9999)
    if (rows) setData(rows as T[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  return { data, loading, reload: load }
}

// アクティブなもののみ取得（入力画面用）
export function useWorkMaster() {
  return useFetch<WorkMaster>('work_master', { is_active: true })
}

export function useLocationMaster() {
  return useFetch<LocationMaster>('location_master', { is_active: true })
}

export function useVarietyMaster() {
  return useFetch<VarietyMaster>('variety_master', { is_active: true })
}

export function useLossReasonMaster(lossType?: 'discard' | 'downgrade') {
  const filter: Record<string, any> = { is_active: true }
  if (lossType) filter.loss_type = lossType
  return useFetch<LossReasonMaster>('loss_reason_master', filter)
}

export function usePositionMaster() {
  return useFetch<PositionMaster>('position_master', { is_active: true })
}

// 全件取得（管理画面用）
export function useWorkMasterAll() {
  return useFetch<WorkMaster>('work_master')
}

export function useLocationMasterAll() {
  return useFetch<LocationMaster>('location_master')
}

export function useVarietyMasterAll() {
  return useFetch<VarietyMaster>('variety_master')
}

export function useLossReasonMasterAll() {
  return useFetch<LossReasonMaster>('loss_reason_master')
}

export function usePositionMasterAll() {
  return useFetch<PositionMaster>('position_master')
}

// システム設定: 対応時間入力の分刻み（system_settings.time_step_minutes）。
// テーブル未作成 / 行なし / 取得失敗のときは既定 10 分にフォールバック
// （006_system_settings.sql 適用前にデプロイしても壊れないため）。
export function useTimeStepMinutes(): number {
  const [step, setStep] = useState(10)

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'time_step_minutes')
          .maybeSingle()
        if (!active || error || !data?.value) return
        const n = parseInt(data.value, 10)
        if (n === 10 || n === 15 || n === 30) setStep(n)
      } catch {
        /* 未作成などは既定 10 のまま */
      }
    })()
    return () => {
      active = false
    }
  }, [])

  return step
}
