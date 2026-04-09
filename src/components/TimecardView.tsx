'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useEmployees } from '@/hooks/useEmployees'
import SelectField from '@/components/SelectField'
import Label from '@/components/Label'
import ConfirmModal from '@/components/ConfirmModal'
import SuccessOverlay from '@/components/SuccessOverlay'

function getToday() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getNowTime() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function TimecardView() {
  const { employees } = useEmployees()
  const [empId, setEmpId] = useState('')
  const [showConfirm, setShowConfirm] = useState<'in' | 'out' | null>(null)
  const [showSuccess, setShowSuccess] = useState<'in' | 'out' | null>(null)
  const [clockIn, setClockIn] = useState<string | null>(null)
  const [clockOut, setClockOut] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const supabase = createClient()

  // 従業員変更時に今日の打刻状況を取得
  useEffect(() => {
    if (!empId) {
      setClockIn(null)
      setClockOut(null)
      return
    }
    const fetchTimecard = async () => {
      const { data } = await supabase
        .from('timecards')
        .select('clock_in, clock_out')
        .eq('employee_id', empId)
        .eq('work_date', getToday())
        .single()
      if (data) {
        setClockIn(data.clock_in)
        setClockOut(data.clock_out)
      } else {
        setClockIn(null)
        setClockOut(null)
      }
    }
    fetchTimecard()
  }, [empId])

  const handleClockIn = async () => {
    setShowConfirm(null)
    setLoading(true)
    const now = new Date().toISOString()
    const { error } = await supabase.from('timecards').upsert(
      {
        employee_id: empId,
        work_date: getToday(),
        clock_in: now,
      },
      { onConflict: 'employee_id,work_date' }
    )
    setLoading(false)
    if (error) {
      alert('登録に失敗しました: ' + error.message)
      return
    }
    setClockIn(now)
    setShowSuccess('in')
  }

  const handleClockOut = async () => {
    setShowConfirm(null)
    setLoading(true)
    const now = new Date().toISOString()
    const { error } = await supabase
      .from('timecards')
      .update({ clock_out: now })
      .eq('employee_id', empId)
      .eq('work_date', getToday())
    setLoading(false)
    if (error) {
      alert('登録に失敗しました: ' + error.message)
      return
    }
    setClockOut(now)
    setShowSuccess('out')
  }

  const formatTime = (iso: string | null) => {
    if (!iso) return '--:--'
    const d = new Date(iso)
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  const empName = employees.find((e) => e.id === empId)?.name || ''

  return (
    <div className="flex items-center justify-center h-full" style={{ animation: 'fadeIn 0.3s' }}>
      <div className="w-full max-w-3xl">
        <div className="mb-10 max-w-sm mx-auto">
          <Label>担当氏名</Label>
          <SelectField
            value={empId}
            onChange={(v) => {
              setEmpId(v)
              setClockIn(null)
              setClockOut(null)
            }}
            options={employees.map((e) => ({ id: e.id, name: e.name }))}
            placeholder="名前を選択してください"
          />
        </div>

        {empId ? (
          <>
            <div className="grid grid-cols-2 gap-8 mb-8" style={{ height: '260px' }}>
              <button
                disabled={!!clockIn || loading}
                onClick={() => setShowConfirm('in')}
                className="rounded-2xl flex flex-col items-center justify-center gap-4 transition-all active:scale-[0.96] disabled:opacity-[0.15]"
                style={{
                  background: clockIn
                    ? '#f3f4f6'
                    : 'linear-gradient(160deg, #b8963e, #d4b96a)',
                  boxShadow: clockIn ? 'none' : '0 8px 32px rgba(184,150,62,0.25)',
                  color: '#fff',
                }}
              >
                <span className="text-7xl">☀️</span>
                <span className="text-3xl font-bold">出勤</span>
              </button>
              <button
                disabled={!clockIn || !!clockOut || loading}
                onClick={() => setShowConfirm('out')}
                className="rounded-2xl flex flex-col items-center justify-center gap-4 transition-all active:scale-[0.96] disabled:opacity-[0.15]"
                style={{
                  background:
                    !clockIn || clockOut
                      ? '#f3f4f6'
                      : 'linear-gradient(160deg, #78716c, #a8a29e)',
                  boxShadow:
                    !clockIn || clockOut ? 'none' : '0 8px 32px rgba(120,113,108,0.25)',
                  color: '#fff',
                }}
              >
                <span className="text-7xl">🌙</span>
                <span className="text-3xl font-bold">退勤</span>
              </button>
            </div>

            <div
              className="text-center rounded-xl py-4"
              style={{ background: '#f5f3ef', border: '1px solid #e5e7eb' }}
            >
              <p className="text-xs mb-1" style={{ color: '#9ca3af' }}>
                本日の記録
              </p>
              <p
                className="text-2xl font-bold"
                style={{ color: '#1f2937', fontFamily: "'DM Mono', monospace" }}
              >
                出勤 {formatTime(clockIn)}　　退勤 {formatTime(clockOut)}
              </p>
            </div>
          </>
        ) : (
          <div
            className="flex items-center justify-center rounded-2xl"
            style={{ height: '260px', border: '2px dashed #e5e7eb' }}
          >
            <div className="text-center">
              <p className="text-5xl mb-4">⏰</p>
              <p className="text-lg" style={{ color: '#9ca3af' }}>
                名前を選択してください
              </p>
            </div>
          </div>
        )}
      </div>

      {showConfirm && (
        <ConfirmModal
          lines={[
            empName,
            `${showConfirm === 'in' ? '出勤' : '退勤'}を記録（${getNowTime()}）`,
          ]}
          onOk={showConfirm === 'in' ? handleClockIn : handleClockOut}
          onCancel={() => setShowConfirm(null)}
        />
      )}
      {showSuccess && (
        <SuccessOverlay
          emoji={showSuccess === 'in' ? '☀️' : '🌙'}
          message={showSuccess === 'in' ? '今日もがんばろう！💪' : 'お疲れ様でした！🎉'}
          onDone={() => setShowSuccess(null)}
        />
      )}
    </div>
  )
}
