'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import type { WorkMaster, LocationMaster, VarietyMaster, LossReasonMaster } from '@/lib/types'

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
