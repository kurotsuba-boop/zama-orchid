'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useEmployees } from '@/hooks/useEmployees'
import { GREENHOUSES } from '@/lib/constants'
import { useVarietyMaster, useLossReasonMaster, usePositionMaster } from '@/hooks/useMaster'
import Chip from '@/components/Chip'
import Stepper from '@/components/Stepper'
import Label from '@/components/Label'
import DatePicker from '@/components/DatePicker'
import ConfirmModal from '@/components/ConfirmModal'
import SuccessOverlay from '@/components/SuccessOverlay'

function getToday() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

type LossData = {
  [variety: string]: {
    discard: { [reason: string]: number }
    downgrade: { [reason: string]: number }
  }
}

export default function LossReport({
  employeeId,
  onResetEmployee,
}: {
  employeeId: string
  onResetEmployee?: () => void
}) {
  const { employees } = useEmployees()
  const { data: varieties } = useVarietyMaster()
  const { data: discardReasons } = useLossReasonMaster('discard')
  const { data: downgradeReasons } = useLossReasonMaster('downgrade')
  const { data: positionOptions } = usePositionMaster()
  const [workDate, setWorkDate] = useState(getToday)
  const [arrivalDate, setArrivalDate] = useState('')
  const empId = employeeId
  const [greenhouses, setGreenhouses] = useState<string[]>([])
  const [positions, setPositions] = useState<string[]>([])
  const [memo, setMemo] = useState('')
  const [expandedIdx, setExpandedIdx] = useState(0)
  const [lossData, setLossData] = useState<LossData>({})
  const [showConfirm, setShowConfirm] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const toggleArray = (arr: string[], setter: (v: string[]) => void, val: string) => {
    setter(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val])
  }

  const setLossValue = (
    variety: string,
    type: 'discard' | 'downgrade',
    reason: string,
    value: number
  ) => {
    setLossData((prev) => {
      const existing = prev[variety] || { discard: {}, downgrade: {} }
      return {
        ...prev,
        [variety]: {
          ...existing,
          [type]: { ...existing[type], [reason]: value },
        },
      }
    })
  }

  const getLossValue = (variety: string, type: 'discard' | 'downgrade', reason: string) => {
    return lossData[variety]?.[type]?.[reason] || 0
  }

  const canSubmit = empId && greenhouses.length > 0 && positions.length > 0 && arrivalDate

  const handleSubmit = async () => {
    setShowConfirm(false)
    const supabase = createClient()

    // ヘッダー INSERT
    const { data: header, error: headerError } = await supabase
      .from('loss_reports')
      .insert({
        work_date: workDate,
        employee_id: empId,
        greenhouses,
        positions,
        seedling_arrival_date: arrivalDate,
        memo: memo || null,
      })
      .select('id')
      .single()

    if (headerError || !header) {
      alert('登録に失敗しました: ' + (headerError?.message || ''))
      return
    }

    // 明細: 0でない項目のみ
    const items: {
      loss_report_id: string
      variety: string
      loss_type: string
      reason: string
      quantity: number
    }[] = []

    varieties.forEach((v) => {
      discardReasons.forEach((r) => {
        const qty = getLossValue(v.label, 'discard', r.label)
        if (qty > 0) {
          items.push({
            loss_report_id: header.id,
            variety: v.label,
            loss_type: 'discard',
            reason: r.label,
            quantity: qty,
          })
        }
      })
      downgradeReasons.forEach((r) => {
        const qty = getLossValue(v.label, 'downgrade', r.label)
        if (qty > 0) {
          items.push({
            loss_report_id: header.id,
            variety: v.label,
            loss_type: 'downgrade',
            reason: r.label,
            quantity: qty,
          })
        }
      })
    })

    if (items.length > 0) {
      const { error: itemsError } = await supabase.from('loss_report_items').insert(items)
      if (itemsError) {
        alert('明細の登録に失敗しました: ' + itemsError.message)
        return
      }
    }

    setShowSuccess(true)
  }

  const reset = () => {
    setWorkDate(getToday())
    setArrivalDate('')
    setGreenhouses([])
    setPositions([])
    setMemo('')
    setLossData({})
    setExpandedIdx(0)
  }

  // 確認モーダル用サマリ
  const empName = employees.find((e) => e.id === empId)?.name || ''
  const totalItems = Object.values(lossData).reduce((sum, v) => {
    return (
      sum +
      Object.values(v.discard).reduce((s, n) => s + n, 0) +
      Object.values(v.downgrade).reduce((s, n) => s + n, 0)
    )
  }, 0)
  const confirmLines = [
    empName,
    `温室: ${greenhouses.join(', ')}`,
    `作業区域: ${positions.join(', ')}`,
    `ロス合計: ${totalItems}件`,
    ...(memo ? [`メモ: ${memo}`] : []),
  ]

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
    <div className="flex gap-4 h-full" style={{ animation: 'fadeIn 0.3s' }}>
      {/* 左カラム: 基本情報 */}
      <div className="w-64 flex flex-col gap-3 flex-shrink-0 h-full min-h-0">
        {/* スクロール可能なフォーム領域 */}
        <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-3 min-h-0">
          <div>
            <Label>作業日</Label>
            <DatePicker value={workDate} onChange={setWorkDate} />
          </div>
          <div>
            <Label>苗入荷日</Label>
            <DatePicker value={arrivalDate} onChange={setArrivalDate} placeholder="苗入荷日を選択" />
          </div>

          <div>
            <Label>作業温室</Label>
            <div className="flex flex-wrap gap-2">
              {GREENHOUSES.map((g) => (
                <Chip
                  key={g}
                  label={g}
                  active={greenhouses.includes(g)}
                  onClick={() => toggleArray(greenhouses, setGreenhouses, g)}
                />
              ))}
            </div>
          </div>

          <div>
            <Label>作業区域</Label>
            <div className="flex flex-wrap gap-2">
              {positionOptions.map((p) => (
                <Chip
                  key={p.id}
                  label={p.label}
                  active={positions.includes(p.label)}
                  onClick={() => toggleArray(positions, setPositions, p.label)}
                />
              ))}
            </div>
          </div>

          <div>
            <Label>メモ</Label>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={2}
              placeholder="自由記入…"
              className="w-full px-4 py-2.5 text-base rounded-xl resize-none focus:outline-none"
              style={{ background: '#ffffff', color: '#1f2937', border: '1.5px solid #e5e7eb' }}
            />
          </div>
        </div>

        {/* 常に画面内に固定される登録ボタン */}
        <button
          disabled={!canSubmit}
          onClick={() => setShowConfirm(true)}
          className="w-full py-4 rounded-xl text-base font-bold text-white active:scale-[0.97] disabled:opacity-25 flex-shrink-0"
          style={{
            background: canSubmit ? '#b8963e' : '#e5e7eb',
            boxShadow: canSubmit ? '0 4px 20px rgba(184,150,62,0.3)' : 'none',
          }}
        >
          登録する
        </button>
      </div>

      {/* 右カラム: 品種別ロス入力 */}
      <div className="flex-1 overflow-y-auto h-full min-h-0">
        <Label>品種別ロス入力</Label>
        <div className="space-y-2">
          {varieties.map((v, i) => (
            <div
              key={v.id}
              className="rounded-xl overflow-hidden transition-all"
              style={{
                background: '#ffffff',
                border: `1.5px solid ${expandedIdx === i ? '#e8dcc3' : '#e5e7eb'}`,
              }}
            >
              <button
                onClick={() => setExpandedIdx(expandedIdx === i ? -1 : i)}
                className="w-full flex items-center justify-between px-4 py-3 text-left"
              >
                <span
                  className="text-base font-semibold"
                  style={{ color: expandedIdx === i ? '#b8963e' : '#1f2937' }}
                >
                  {v.label}
                </span>
                <span style={{ color: expandedIdx === i ? '#b8963e' : '#9ca3af' }}>
                  {expandedIdx === i ? '▾' : '▸'}
                </span>
              </button>

              {expandedIdx === i && (
                <div
                  className="px-4 pb-4 grid grid-cols-2 gap-4"
                  style={{ animation: 'slideUp 0.15s' }}
                >
                  {/* 破棄 */}
                  <div>
                    <div className="flex items-center gap-2 mb-3 pb-1.5" style={{ borderBottom: '2px solid #fecaca' }}>
                      <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: '#dc2626' }} />
                      <p className="text-base font-bold" style={{ color: '#dc2626' }}>破棄</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {discardReasons.map((r) => (
                        <div key={r.id} className="flex flex-col items-center gap-1.5">
                          <div className="flex items-center gap-1">
                            <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: '#dc2626' }} />
                            <p className="text-xs font-semibold" style={{ color: '#6b7280' }}>
                              {r.label}
                            </p>
                          </div>
                          <Stepper
                            value={getLossValue(v.label, 'discard', r.label)}
                            onChange={(val) => setLossValue(v.label, 'discard', r.label, val)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* B・C品 */}
                  <div>
                    <div className="flex items-center gap-2 mb-3 pb-1.5" style={{ borderBottom: '2px solid #fde68a' }}>
                      <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: '#d97706' }} />
                      <p className="text-base font-bold" style={{ color: '#d97706' }}>B・C品</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {downgradeReasons.map((r) => (
                        <div key={r.id} className="flex flex-col items-center gap-1.5">
                          <div className="flex items-center gap-1">
                            <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: '#d97706' }} />
                            <p className="text-xs font-semibold" style={{ color: '#6b7280' }}>
                              {r.label}
                            </p>
                          </div>
                          <Stepper
                            value={getLossValue(v.label, 'downgrade', r.label)}
                            onChange={(val) => setLossValue(v.label, 'downgrade', r.label, val)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
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
            onResetEmployee?.()
          }}
        />
      )}
    </div>
  )
}
