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
  const [plantCount, setPlantCount] = useState(30)
  const [plantCount3f, setPlantCount3f] = useState(0)
  const [plantCount5f, setPlantCount5f] = useState(0)
  const [showConfirm, setShowConfirm] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const isA = workCategory === 'A'
  const canSubmit = empId && workType && hours > 0 && (!isA || location)

  const selectWork = (label: string, category: 'A' | 'B') => {
    setWorkType(label)
    setWorkCategory(category)
    setLocation('')
  }

  const reset = () => {
    setDate(getToday())
    setEmpId('')
    setWorkType('')
    setWorkCategory('')
    setHours(3.0)
    setLocation('')
    setPlantCount(30)
    setPlantCount3f(0)
    setPlantCount5f(0)
  }

  const handleSubmit = async () => {
    setShowConfirm(false)
    const supabase = createClient()
    const { error } = await supabase.from('work_reports').insert({
      reported_at: `${date}T00:00:00+09:00`,
      employee_id: empId,
      work_type: workType,
      work_category: workCategory,
      hours,
      location: isA ? location : null,
      plant_count: isA ? plantCount : null,
      plant_count_3f: isA ? plantCount3f : null,
      plant_count_5f: isA ? plantCount5f : null,
    })
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
    `${workType}　${hours.toFixed(1)}h`,
    ...(isA ? [`${location}　${plantCount}株（3F: ${plantCount3f} / 5F: ${plantCount5f}）`] : []),
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
            className="flex-1 rounded-2xl p-5 flex flex-col justify-between"
            style={{
              background: '#faf6ed',
              border: '1.5px solid #e8dcc3',
              animation: 'slideUp 0.2s',
            }}
          >
            <div>
              <Label>{isA ? '仕立て時間' : '作業時間'}</Label>
              <SliderInput value={hours} onChange={setHours} showTicks={false} tight />
            </div>
            {isA && (
              <>
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
                <div>
                  <p className="text-lg font-bold mb-1" style={{ color: '#b8963e' }}>株数</p>
                  <SliderInput
                    value={plantCount}
                    onChange={setPlantCount}
                    min={0}
                    max={150}
                    step={1}
                    unit="株"
                    decimal={0}
                    size="large"
                    showTicks={false}
                    tight
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-lg font-bold mb-1" style={{ color: '#b8963e' }}>3F</p>
                    <SliderInput
                      value={plantCount3f}
                      onChange={setPlantCount3f}
                      min={0}
                      max={50}
                      step={1}
                      unit="株"
                      decimal={0}
                      size="large"
                      showTicks={false}
                      tight
                    />
                  </div>
                  <div>
                    <p className="text-lg font-bold mb-1" style={{ color: '#b8963e' }}>5F</p>
                    <SliderInput
                      value={plantCount5f}
                      onChange={setPlantCount5f}
                      min={0}
                      max={50}
                      step={1}
                      unit="株"
                      decimal={0}
                      size="large"
                      showTicks={false}
                      tight
                    />
                  </div>
                </div>
              </>
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
