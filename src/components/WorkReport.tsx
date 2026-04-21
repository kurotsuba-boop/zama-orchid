'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useEmployees } from '@/hooks/useEmployees'
import { useWorkMaster, useLocationMaster } from '@/hooks/useMaster'
import Chip from '@/components/Chip'
import SliderInput from '@/components/SliderInput'
import SelectField from '@/components/SelectField'
import Label from '@/components/Label'
import DatePicker from '@/components/DatePicker'
import ConfirmModal from '@/components/ConfirmModal'
import SuccessOverlay from '@/components/SuccessOverlay'
import Stepper from '@/components/Stepper'

function getToday() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

type SuccessMode = null | 'single' | 'final'

export default function WorkReport() {
  const { employees } = useEmployees()
  const { data: workTypes } = useWorkMaster()
  const { data: locations } = useLocationMaster()
  const workA = workTypes.filter((w) => w.category === 'A')
  const workB = workTypes.filter((w) => w.category === 'B')

  const [date, setDate] = useState(getToday)
  const [empId, setEmpId] = useState('')
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
  const [showConfirm, setShowConfirm] = useState(false)
  const [successMode, setSuccessMode] = useState<SuccessMode>(null)
  const [sessionCount, setSessionCount] = useState(0)
  const [totalHours, setTotalHours] = useState(0)
  const [finalizing, setFinalizing] = useState(false)

  // 選択中の作業マスタからフラグを読み取る
  const currentWork = workTypes.find((w) => w.label === workType)
  const hasFloorCount = currentWork?.has_floor_count === true
  const hasBendCount = currentWork?.has_bend_count === true
  const hasPoleCount = currentWork?.has_pole_count === true

  const canSubmit = Boolean(empId && workType && hours > 0 && location)
  const canFinalize = sessionCount > 0 && !finalizing

  const resetSubCounts = () => {
    setCount1f(0); setCount2f(0); setCount3f(0); setCount4f(0); setCount5f(0); setCount5fOver(0)
    setBendCount(0); setPoleCount(0)
  }

  // 作業関連だけリセット（氏名・日付は残す）
  const resetWork = () => {
    setWorkType('')
    setWorkCategory('')
    setHours(3.0)
    setLocation('')
    resetSubCounts()
  }

  // 全体リセット（最終確定後）
  const resetAll = () => {
    setDate(getToday())
    setEmpId('')
    setSessionCount(0)
    setTotalHours(0)
    resetWork()
  }

  const selectWork = (label: string, category: 'A' | 'B') => {
    setWorkType(label)
    setWorkCategory(category)
    setLocation('')
    resetSubCounts()
  }

  const handleSubmit = async () => {
    setShowConfirm(false)
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
    }
    if (hasFloorCount) {
      payload.plant_count_1f = count1f
      payload.plant_count_2f = count2f
      payload.plant_count_3f = count3f
      payload.plant_count_4f = count4f
      payload.plant_count_5f = count5f
      payload.plant_count_5f_over = count5fOver
    }
    if (hasBendCount) {
      payload.bend_count = bendCount
    }
    if (hasPoleCount) {
      payload.pole_count = poleCount
    }
    const { error } = await supabase.from('work_reports').insert(payload)
    if (error) {
      alert('登録に失敗しました: ' + error.message)
      return
    }
    setSessionCount((c) => c + 1)
    setSuccessMode('single')
  }

  const handleFinalize = async () => {
    if (!canFinalize) return
    setFinalizing(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('work_reports')
      .select('hours')
      .eq('employee_id', empId)
      .gte('reported_at', `${date}T00:00:00+09:00`)
      .lte('reported_at', `${date}T23:59:59+09:00`)
    setFinalizing(false)
    if (error) {
      alert('合計取得に失敗しました: ' + error.message)
      return
    }
    const sum = (data || []).reduce((a, r: any) => a + (Number(r.hours) || 0), 0)
    setTotalHours(sum)
    setSuccessMode('final')
  }

  const empName = employees.find((e) => e.id === empId)?.name || ''
  const confirmLines = [
    date,
    empName,
    `${workType}　${hours.toFixed(1)}h　${location}`,
    ...(hasFloorCount ? [`1F:${count1f} / 2F:${count2f} / 3F:${count3f} / 4F:${count4f} / 5F:${count5f} / 5F以上:${count5fOver} 株`] : []),
    ...(hasBendCount ? [`曲げ数: ${bendCount} 本`] : []),
    ...(hasPoleCount ? [`立て数: ${poleCount} 本`] : []),
  ]

  const clamp150 = (v: number) => Math.min(150, Math.max(0, v))

  return (
    <div className="flex flex-col h-full gap-3" style={{ animation: 'fadeIn 0.3s' }}>
      {/* 最終確定ボタン（右上） */}
      <div className="flex justify-end">
        <button
          onClick={handleFinalize}
          disabled={!canFinalize}
          className="px-5 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: '#ffffff',
            color: '#b8963e',
            border: '1.5px solid #b8963e',
          }}
        >
          ✓ 最終確定{sessionCount > 0 ? `（${sessionCount}件登録済み）` : ''}
        </button>
      </div>

      {/* メイン2カラム */}
      <div className="flex gap-8 flex-1 min-h-0">
        {/* 左カラム: 入力 */}
        <div className="flex-1 flex flex-col gap-5 overflow-y-auto pr-3">
          <div>
            <Label>担当氏名</Label>
            <SelectField
              value={empId}
              onChange={setEmpId}
              options={employees.map((e) => ({ id: e.id, name: e.name }))}
              placeholder="名前を選択してください"
            />
          </div>

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
                  <p className="text-sm font-bold mb-0.5" style={{ color: '#b8963e' }}>株数</p>
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
              animation: canSubmit ? 'pulseGlow 1.8s ease-in-out infinite' : undefined,
            }}
          >
            この内容で登録 ✓
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
      {successMode === 'single' && (
        <SuccessOverlay
          emoji="🌸"
          message="登録しました！次の作業をどうぞ"
          onDone={() => {
            setSuccessMode(null)
            resetWork()
          }}
        />
      )}
      {successMode === 'final' && (
        <SuccessOverlay
          emoji="🌸"
          message={`本日の作業 計 ${totalHours.toFixed(1)}h　お疲れ様でした！`}
          onDone={() => {
            setSuccessMode(null)
            resetAll()
          }}
        />
      )}
    </div>
  )
}
