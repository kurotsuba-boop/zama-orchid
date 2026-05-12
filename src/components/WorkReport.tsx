'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useEmployees } from '@/hooks/useEmployees'
import { useWorkMaster, useLocationMaster } from '@/hooks/useMaster'
import Chip from '@/components/Chip'
import SliderInput from '@/components/SliderInput'
import Label from '@/components/Label'
import DatePicker from '@/components/DatePicker'
import ConfirmModal from '@/components/ConfirmModal'
import SuccessOverlay from '@/components/SuccessOverlay'
import Stepper from '@/components/Stepper'

function getToday() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

type SuccessMode = null | 'create' | 'update'

export default function WorkReport({ employeeId }: { employeeId: string }) {
  const { employees } = useEmployees()
  const { data: workTypes } = useWorkMaster()
  const { data: locations } = useLocationMaster()
  const workA = workTypes.filter((w) => w.category === 'A')
  const workB = workTypes.filter((w) => w.category === 'B')

  const empId = employeeId

  const [date, setDate] = useState(getToday)
  const [workType, setWorkType] = useState('')
  const [workCategory, setWorkCategory] = useState<'A' | 'B' | ''>('')
  const [hours, setHours] = useState(3.0)
  const [location, setLocation] = useState('')
  const [count1f, setCount1f] = useState(0)
  const [count2f, setCount2f] = useState(0)
  const [count3f, setCount3f] = useState(0)
  const [count4f, setCount4f] = useState(0)
  const [count5f, setCount5f] = useState(0)
  const [count5fOver, setCount5fOver] = useState(0)
  const [bendCount, setBendCount] = useState(0)
  const [poleCount, setPoleCount] = useState(0)
  const [unitCount, setUnitCount] = useState(0)
  const [showConfirm, setShowConfirm] = useState(false)
  const [successMode, setSuccessMode] = useState<SuccessMode>(null)
  const [todayReports, setTodayReports] = useState<any[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const currentWork = workTypes.find((w) => w.label === workType)
  const hasFloorCount = currentWork?.has_floor_count === true
  const hasUnitCount = currentWork?.has_unit_count === true
  const hasBendCount = currentWork?.has_bend_count === true
  const hasPoleCount = currentWork?.has_pole_count === true

  const canSubmit = Boolean(empId && workType && hours > 0 && location && !submitting)

  // 当日分の登録一覧取得
  const fetchTodayReports = useCallback(async () => {
    if (!empId || !date) {
      setTodayReports([])
      return
    }
    const supabase = createClient()
    const { data } = await supabase
      .from('work_reports')
      .select('*')
      .eq('employee_id', empId)
      .gte('reported_at', `${date}T00:00:00+09:00`)
      .lte('reported_at', `${date}T23:59:59+09:00`)
      .order('created_at', { ascending: true })
    setTodayReports(data || [])
  }, [empId, date])

  useEffect(() => {
    fetchTodayReports()
  }, [fetchTodayReports])

  const resetSubCounts = () => {
    setCount1f(0); setCount2f(0); setCount3f(0); setCount4f(0); setCount5f(0); setCount5fOver(0)
    setBendCount(0); setPoleCount(0); setUnitCount(0)
  }

  // 作業関連だけリセット（氏名・日付は残す）
  const resetWork = () => {
    setWorkType('')
    setWorkCategory('')
    setHours(3.0)
    setLocation('')
    resetSubCounts()
    setEditingId(null)
  }

  const selectWork = (label: string, category: 'A' | 'B') => {
    setWorkType(label)
    setWorkCategory(category)
    setLocation('')
    resetSubCounts()
  }

  // 編集モード開始
  const handleEdit = (r: any) => {
    setEditingId(r.id)
    setWorkType(r.work_type)
    setWorkCategory(r.work_category)
    setHours(Number(r.hours))
    setLocation(r.location || '')
    setCount1f(r.plant_count_1f ?? 0)
    setCount2f(r.plant_count_2f ?? 0)
    setCount3f(r.plant_count_3f ?? 0)
    setCount4f(r.plant_count_4f ?? 0)
    setCount5f(r.plant_count_5f ?? 0)
    setCount5fOver(r.plant_count_5f_over ?? 0)
    setBendCount(r.bend_count ?? 0)
    setPoleCount(r.pole_count ?? 0)
    setUnitCount(r.unit_count ?? 0)
  }

  const cancelEdit = () => {
    resetWork()
  }

  // 削除
  const handleDelete = async (r: any) => {
    if (!window.confirm(`「${r.work_type}」の作業記録を削除しますか？`)) return
    const supabase = createClient()
    const { error } = await supabase.from('work_reports').delete().eq('id', r.id)
    if (error) {
      alert('削除に失敗しました: ' + error.message)
      return
    }
    // 編集中のものを削除した場合はフォームもクリア
    if (editingId === r.id) resetWork()
    await fetchTodayReports()
  }

  const handleSubmit = async () => {
    setShowConfirm(false)
    setSubmitting(true)
    const supabase = createClient()
    const payload: any = {
      reported_at: `${date}T00:00:00+09:00`,
      employee_id: empId,
      work_type: workType,
      work_category: workCategory,
      hours,
      location,
      plant_count: null,
      plant_count_1f: null,
      plant_count_2f: null,
      plant_count_3f: null,
      plant_count_4f: null,
      plant_count_5f: null,
      plant_count_5f_over: null,
      bend_count: null,
      pole_count: null,
      unit_count: null,
    }
    if (hasFloorCount) {
      payload.plant_count_1f = count1f
      payload.plant_count_2f = count2f
      payload.plant_count_3f = count3f
      payload.plant_count_4f = count4f
      payload.plant_count_5f = count5f
      payload.plant_count_5f_over = count5fOver
    }
    if (hasUnitCount) {
      payload.unit_count = unitCount
    }
    if (hasBendCount) {
      payload.bend_count = bendCount
    }
    if (hasPoleCount) {
      payload.pole_count = poleCount
    }

    let error
    if (editingId) {
      const { error: e } = await supabase
        .from('work_reports')
        .update(payload)
        .eq('id', editingId)
      error = e
    } else {
      const { error: e } = await supabase.from('work_reports').insert(payload)
      error = e
    }

    setSubmitting(false)
    if (error) {
      alert(`${editingId ? '更新' : '登録'}に失敗しました: ` + error.message)
      return
    }
    const wasEdit = !!editingId
    await fetchTodayReports()
    setSuccessMode(wasEdit ? 'update' : 'create')
  }

  const empName = employees.find((e) => e.id === empId)?.name || ''
  const confirmLines = [
    date,
    empName,
    `${workType}　${hours.toFixed(1)}h　${location}`,
    ...(hasFloorCount ? [`個数 1F:${count1f} / 2F:${count2f} / 3F:${count3f} / 4F:${count4f} / 5F:${count5f} / 5F以上:${count5fOver}`] : []),
    ...(hasUnitCount ? [`個数: ${unitCount}`] : []),
    ...(hasBendCount ? [`曲げ数: ${bendCount} 本`] : []),
    ...(hasPoleCount ? [`立て数: ${poleCount} 本`] : []),
  ]

  const clamp150 = (v: number) => Math.min(150, Math.max(0, v))

  // 当日合計時間
  const todaySumHours = todayReports.reduce((s, r) => s + Number(r.hours || 0), 0)

  // カード用のサブ情報サマリ
  const summarizeExtras = (r: any) => {
    const parts: string[] = []
    const floors = [
      ['1F', r.plant_count_1f],
      ['2F', r.plant_count_2f],
      ['3F', r.plant_count_3f],
      ['4F', r.plant_count_4f],
      ['5F', r.plant_count_5f],
      ['5F+', r.plant_count_5f_over],
    ].filter(([, v]) => v && Number(v) > 0)
    if (floors.length > 0) {
      parts.push('個数: ' + floors.map(([k, v]) => `${k}${v}`).join('/'))
    }
    if (r.unit_count && Number(r.unit_count) > 0) parts.push(`個数${r.unit_count}`)
    if (r.bend_count && Number(r.bend_count) > 0) parts.push(`曲げ${r.bend_count}本`)
    if (r.pole_count && Number(r.pole_count) > 0) parts.push(`立て${r.pole_count}本`)
    return parts.join(' · ')
  }

  if (!empId) {
    return (
      <div className="flex items-center justify-center h-full" style={{ animation: 'fadeIn 0.3s' }}>
        <div className="text-center">
          <p className="text-6xl mb-4">👤</p>
          <p className="text-xl font-semibold" style={{ color: '#9ca3af' }}>
            担当者を選択してください
          </p>
          <p className="text-sm mt-2" style={{ color: '#9ca3af' }}>
            ヘッダーの「担当者を選択」をタップ
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full gap-3" style={{ animation: 'fadeIn 0.3s' }}>
      {/* 本日の登録済作業バー（0件なら非表示） */}
      {todayReports.length > 0 && (
        <div
          className="rounded-xl px-4 py-2.5 flex-shrink-0"
          style={{ background: '#faf6ed', border: '1.5px solid #e8dcc3' }}
        >
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs font-bold tracking-[0.15em]" style={{ color: '#b8963e' }}>
              本日の登録済作業（{todayReports.length}件）
            </p>
            <p
              className="text-sm font-bold"
              style={{ color: '#b8963e', fontFamily: "'DM Mono', monospace" }}
            >
              計 {todaySumHours.toFixed(1)}h
            </p>
          </div>
          <div className="flex flex-col gap-1 overflow-y-auto" style={{ maxHeight: '110px' }}>
            {todayReports.map((r) => {
              const isEditing = editingId === r.id
              const extras = summarizeExtras(r)
              return (
                <div
                  key={r.id}
                  className="flex items-center gap-3 px-3 py-1.5 rounded-lg"
                  style={{
                    background: '#ffffff',
                    border: isEditing ? '1.5px solid #b8963e' : '1px solid #e5e7eb',
                  }}
                >
                  <span className="text-base flex-shrink-0" style={{ color: '#b8963e' }}>•</span>
                  <div className="flex-1 min-w-0 flex items-center gap-3 flex-wrap">
                    <span className="text-sm font-semibold" style={{ color: '#1f2937' }}>
                      {r.work_type}
                    </span>
                    <span
                      className="text-sm font-bold whitespace-nowrap"
                      style={{ color: '#b8963e', fontFamily: "'DM Mono', monospace" }}
                    >
                      {Number(r.hours).toFixed(1)}h
                    </span>
                    <span className="text-xs whitespace-nowrap" style={{ color: '#6b7280' }}>
                      {r.location}
                    </span>
                    {extras && (
                      <span className="text-xs whitespace-nowrap" style={{ color: '#9ca3af' }}>
                        {extras}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => handleEdit(r)}
                      className="text-xs font-bold px-2.5 py-1 rounded-lg active:scale-95 transition-all"
                      style={{ color: '#b8963e', background: '#faf6ed', border: '1px solid #e8dcc3' }}
                    >
                      修正
                    </button>
                    <button
                      onClick={() => handleDelete(r)}
                      className="text-xs font-bold px-2.5 py-1 rounded-lg active:scale-95 transition-all"
                      style={{ color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca' }}
                    >
                      削除
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 編集中バッジ */}
      {editingId && (
        <div
          className="rounded-lg px-4 py-2 flex items-center justify-between flex-shrink-0"
          style={{ background: '#b8963e', color: '#fff' }}
        >
          <span className="text-sm font-bold">✏ 編集中</span>
          <button
            onClick={cancelEdit}
            className="text-xs font-bold underline active:scale-95"
            style={{ color: '#fff' }}
          >
            編集をキャンセル
          </button>
        </div>
      )}

      {/* メイン2カラム */}
      <div className="flex gap-8 flex-1 min-h-0">
        {/* 左カラム: 入力 */}
        <div className="flex-1 flex flex-col gap-5 overflow-y-auto pr-3">
          <div>
            <Label>日付</Label>
            <DatePicker value={date} onChange={setDate} />
          </div>

          <div>
            <Label>仕立て作業</Label>
            <div className="flex flex-wrap gap-2 mb-4">
              {workA.map((w) => (
                <Chip
                  key={w.id}
                  label={w.label}
                  active={workType === w.label}
                  onClick={() => selectWork(w.label, 'A')}
                  size="lg"
                />
              ))}
            </div>
            <Label>その他作業</Label>
            <div className="flex flex-wrap gap-2">
              {workB.map((w) => (
                <Chip
                  key={w.id}
                  label={w.label}
                  active={workType === w.label}
                  onClick={() => selectWork(w.label, 'B')}
                />
              ))}
            </div>
          </div>
        </div>

        {/* 右カラム: 詳細パネル + 登録ボタン */}
        <div className="w-[450px] h-full flex flex-col gap-2 flex-shrink-0">
          {workType ? (
            <div
              className="flex-1 min-h-0 rounded-2xl p-3 flex flex-col gap-1.5 overflow-hidden"
              style={{
                background: '#faf6ed',
                border: '1.5px solid #e8dcc3',
                animation: 'slideUp 0.2s',
              }}
            >
              <div>
                <Label>対応時間</Label>
                <SliderInput value={hours} onChange={setHours} size="medium" showTicks={false} tight />
              </div>

              <div>
                <p className="text-xs font-bold tracking-[0.15em] uppercase mb-0.5" style={{ color: '#9ca3af' }}>場所</p>
                <div className="flex flex-wrap gap-1">
                  {locations.map((l) => (
                    <Chip
                      key={l.id}
                      label={l.label}
                      active={location === l.label}
                      onClick={() => setLocation(l.label)}
                    />
                  ))}
                </div>
              </div>

              {hasFloorCount && (
                <div>
                  <p className="text-sm font-bold mb-0.5" style={{ color: '#b8963e' }}>個数</p>
                  <div className="grid grid-cols-3 gap-x-1 gap-y-0">
                    {[
                      { label: '1F', value: count1f, set: setCount1f },
                      { label: '2F', value: count2f, set: setCount2f },
                      { label: '3F', value: count3f, set: setCount3f },
                      { label: '4F', value: count4f, set: setCount4f },
                      { label: '5F', value: count5f, set: setCount5f },
                      { label: '5F以上', value: count5fOver, set: setCount5fOver },
                    ].map((f) => (
                      <div key={f.label} className="flex flex-col items-center">
                        <p className="text-xs font-bold leading-none" style={{ color: '#9ca3af' }}>{f.label}</p>
                        <div style={{ transform: 'scale(0.8)', transformOrigin: 'top center', height: '38px' }}>
                          <Stepper
                            value={f.value}
                            onChange={(v) => f.set(clamp150(v))}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {hasUnitCount && (
                <div>
                  <p className="text-sm font-bold mb-0.5" style={{ color: '#b8963e' }}>個数</p>
                  <SliderInput
                    value={unitCount}
                    onChange={setUnitCount}
                    min={0}
                    max={300}
                    step={1}
                    unit="個"
                    decimal={0}
                    size="compact"
                    showTicks={false}
                    tight
                  />
                </div>
              )}

              {(hasBendCount || hasPoleCount) && (
                <div className={`grid gap-2 ${hasBendCount && hasPoleCount ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  {hasBendCount && (
                    <div>
                      <p className="text-sm font-bold mb-0.5" style={{ color: '#b8963e' }}>曲げ数</p>
                      <SliderInput
                        value={bendCount}
                        onChange={setBendCount}
                        min={0}
                        max={300}
                        step={1}
                        unit="本"
                        decimal={0}
                        size="compact"
                        showTicks={false}
                        tight
                      />
                    </div>
                  )}
                  {hasPoleCount && (
                    <div>
                      <p className="text-sm font-bold mb-0.5" style={{ color: '#b8963e' }}>立て数</p>
                      <SliderInput
                        value={poleCount}
                        onChange={setPoleCount}
                        min={0}
                        max={300}
                        step={1}
                        unit="本"
                        decimal={0}
                        size="compact"
                        showTicks={false}
                        tight
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div
              className="flex-1 rounded-2xl flex items-center justify-center"
              style={{ border: '2px dashed #e5e7eb' }}
            >
              <div className="text-center">
                <p className="text-4xl mb-3">👈</p>
                <p className="text-base" style={{ color: '#9ca3af' }}>
                  作業内容を選択
                </p>
              </div>
            </div>
          )}

          <button
            disabled={!canSubmit}
            onClick={() => setShowConfirm(true)}
            className="py-4 rounded-xl text-xl font-bold text-white transition-all active:scale-[0.97] disabled:opacity-25 flex-shrink-0"
            style={{
              background: canSubmit ? '#b8963e' : '#e5e7eb',
              boxShadow: canSubmit ? '0 4px 20px rgba(184,150,62,0.3)' : 'none',
              animation: canSubmit && !editingId ? 'pulseGlow 1.8s ease-in-out infinite' : undefined,
            }}
          >
            {editingId ? '更新する' : 'この内容で登録 ✓'}
          </button>
        </div>
      </div>

      {showConfirm && (
        <ConfirmModal
          lines={confirmLines}
          onOk={handleSubmit}
          onCancel={() => setShowConfirm(false)}
        />
      )}
      {successMode === 'create' && (
        <SuccessOverlay
          emoji="🌸"
          message="登録しました！次の作業をどうぞ"
          onDone={() => {
            setSuccessMode(null)
            resetWork()
          }}
        />
      )}
      {successMode === 'update' && (
        <SuccessOverlay
          emoji="✨"
          message="更新しました！"
          onDone={() => {
            setSuccessMode(null)
            resetWork()
          }}
        />
      )}
    </div>
  )
}
