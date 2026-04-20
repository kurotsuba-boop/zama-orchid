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

function getToday() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// 作業名による入力項目分岐
const FLOOR_WORKS = ['胡蝶蘭作り', 'ミディ']
const BEND_WORK = '曲げ'
const POLE_WORK = '支柱立て'

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
  const [showSuccess, setShowSuccess] = useState(false)

  const isFloors = FLOOR_WORKS.includes(workType)
  const isBend = workType === BEND_WORK
  const isPole = workType === POLE_WORK

  const canSubmit = Boolean(empId && workType && hours > 0 && location)

  const resetSubCounts = () => {
    setCount1f(0); setCount2f(0); setCount3f(0); setCount4f(0); setCount5f(0); setCount5fOver(0)
    setBendCount(0); setPoleCount(0)
  }

  const selectWork = (label: string, category: 'A' | 'B') => {
    setWorkType(label)
    setWorkCategory(category)
    setLocation('')
    resetSubCounts()
  }

  const reset = () => {
    setDate(getToday())
    setEmpId('')
    setWorkType('')
    setWorkCategory('')
    setHours(3.0)
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
    if (isFloors) {
      payload.plant_count_1f = count1f
      payload.plant_count_2f = count2f
      payload.plant_count_3f = count3f
      payload.plant_count_4f = count4f
      payload.plant_count_5f = count5f
      payload.plant_count_5f_over = count5fOver
    } else if (isBend) {
      payload.bend_count = bendCount
    } else if (isPole) {
      payload.pole_count = poleCount
    }
    const { error } = await supabase.from('work_reports').insert(payload)
    if (error) {
      alert('登録に失敗しました: ' + error.message)
      return
    }
    setShowSuccess(true)
  }

  const empName = employees.find((e) => e.id === empId)?.name || ''
  const confirmLines = [
    date,
    empName,
    `${workType}　${hours.toFixed(1)}h　${location}`,
    ...(isFloors ? [`1F:${count1f} / 2F:${count2f} / 3F:${count3f} / 4F:${count4f} / 5F:${count5f} / 5F以上:${count5fOver} 株`] : []),
    ...(isBend ? [`曲げ数: ${bendCount} 本`] : []),
    ...(isPole ? [`立て数: ${poleCount} 本`] : []),
  ]

  return (
    <div className="flex gap-8 h-full" style={{ animation: 'fadeIn 0.3s' }}>
      {/* 左カラム: 入力 */}
      <div
        className="flex-1 flex flex-col gap-5 overflow-y-auto pr-3"
        style={{ maxHeight: 'calc(100vh - 100px)' }}
      >
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
      <div className="w-[450px] h-full flex flex-col justify-between flex-shrink-0">
        {workType ? (
          <div
            className="flex-1 rounded-2xl p-5 flex flex-col gap-4 overflow-y-auto"
            style={{
              background: '#faf6ed',
              border: '1.5px solid #e8dcc3',
              animation: 'slideUp 0.2s',
            }}
          >
            <div>
              <Label>対応時間</Label>
              <SliderInput value={hours} onChange={setHours} showTicks={false} tight />
            </div>

            <div>
              <p className="text-xs font-bold tracking-[0.15em] uppercase mb-1" style={{ color: '#9ca3af' }}>場所</p>
              <div className="flex flex-wrap gap-1.5">
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

            {isFloors && (
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: '1F', value: count1f, set: setCount1f },
                  { label: '2F', value: count2f, set: setCount2f },
                  { label: '3F', value: count3f, set: setCount3f },
                  { label: '4F', value: count4f, set: setCount4f },
                  { label: '5F', value: count5f, set: setCount5f },
                  { label: '5F以上', value: count5fOver, set: setCount5fOver },
                ].map((f) => (
                  <div key={f.label}>
                    <p className="text-sm font-bold mb-1" style={{ color: '#b8963e' }}>{f.label}</p>
                    <SliderInput
                      value={f.value}
                      onChange={f.set}
                      min={0}
                      max={150}
                      step={1}
                      unit="株"
                      decimal={0}
                      size="compact"
                      showTicks={false}
                      tight
                    />
                  </div>
                ))}
              </div>
            )}

            {isBend && (
              <div>
                <p className="text-lg font-bold mb-1" style={{ color: '#b8963e' }}>曲げ数</p>
                <SliderInput
                  value={bendCount}
                  onChange={setBendCount}
                  min={0}
                  max={300}
                  step={1}
                  unit="本"
                  decimal={0}
                  size="large"
                  showTicks={false}
                  tight
                />
              </div>
            )}

            {isPole && (
              <div>
                <p className="text-lg font-bold mb-1" style={{ color: '#b8963e' }}>立て数</p>
                <SliderInput
                  value={poleCount}
                  onChange={setPoleCount}
                  min={0}
                  max={300}
                  step={1}
                  unit="本"
                  decimal={0}
                  size="large"
                  showTicks={false}
                  tight
                />
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
          className="py-4 mt-2 rounded-xl text-xl font-bold text-white transition-all active:scale-[0.97] disabled:opacity-25"
          style={{
            background: canSubmit ? '#b8963e' : '#e5e7eb',
            boxShadow: canSubmit ? '0 4px 20px rgba(184,150,62,0.3)' : 'none',
            animation: canSubmit ? 'pulseGlow 1.8s ease-in-out infinite' : undefined,
          }}
        >
          この内容で登録 ✓
        </button>
      </div>

      {showConfirm && (
        <ConfirmModal
          lines={confirmLines}
          onOk={handleSubmit}
          onCancel={() => setShowConfirm(false)}
        />
      )}
      {showSuccess && (
        <SuccessOverlay
          emoji="🌸"
          message="お疲れ様でした！"
          onDone={() => {
            setShowSuccess(false)
            reset()
          }}
        />
      )}
    </div>
  )
}
