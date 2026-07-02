'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell,
} from 'recharts'
import {
  fetchWorkByType, fetchWorkByEmployee, fetchWorkByDay,
  fetchLossByVariety, fetchLossByReason, fetchLossMonthlyTrend,
  fetchAttendanceMonth,
} from '@/lib/analytics'
import { createClient } from '@/lib/supabase'

// ── カラーパレット ──
const COLORS = ['#b8963e', '#d4b96a', '#8b6f2f', '#c4a854', '#6b7280']
const COLORS_EXTENDED = [...COLORS, '#9ca3af', '#78716c', '#a8a29e', '#d97706', '#dc2626']

// ── CSV ユーティリティ ──
function downloadCsv(filename: string, rows: (string | number | null | undefined)[][]) {
  const bom = '﻿'
  const csv = rows
    .map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function CsvButton({ onClick, loading }: { onClick: () => void; loading?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="px-4 py-2 rounded-lg text-sm font-bold active:scale-95 transition-all disabled:opacity-40 whitespace-nowrap"
      style={{ background: '#ffffff', color: '#b8963e', border: '1.5px solid #b8963e' }}
    >
      {loading ? '取得中…' : '📥 ローデータCSV'}
    </button>
  )
}

// ── ユーティリティ ──
function getToday() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getMonday() {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const mon = new Date(d.setDate(diff))
  return `${mon.getFullYear()}-${String(mon.getMonth() + 1).padStart(2, '0')}-${String(mon.getDate()).padStart(2, '0')}`
}

function getMonthStart() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

function getLastMonthRange(): [string, string] {
  const d = new Date()
  const first = new Date(d.getFullYear(), d.getMonth() - 1, 1)
  const last = new Date(d.getFullYear(), d.getMonth(), 0)
  const fmt = (dt: Date) =>
    `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
  return [fmt(first), fmt(last)]
}

type Period = 'day' | 'week' | 'month' | 'last_month' | 'custom'

function usePeriod(initial: Period = 'month') {
  const [period, setPeriod] = useState<Period>(initial)
  const [dayDate, setDayDate] = useState(getToday())
  const [customFrom, setCustomFrom] = useState(getMonthStart())
  const [customTo, setCustomTo] = useState(getToday())

  const range = useCallback((): [string, string] => {
    switch (period) {
      case 'day': return [dayDate, dayDate]
      case 'week': return [getMonday(), getToday()]
      case 'month': return [getMonthStart(), getToday()]
      case 'last_month': return getLastMonthRange()
      case 'custom': return [customFrom, customTo]
    }
  }, [period, dayDate, customFrom, customTo])

  return { period, setPeriod, dayDate, setDayDate, customFrom, setCustomFrom, customTo, setCustomTo, range }
}

// ── 共通UI ──
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl p-6"
      style={{ background: '#ffffff', border: '1px solid #e5e7eb' }}
    >
      <h3 className="text-lg font-bold mb-4" style={{ color: '#1f2937' }}>{title}</h3>
      {children}
    </div>
  )
}

function PeriodSelector({
  period, setPeriod, dayDate, setDayDate, customFrom, setCustomFrom, customTo, setCustomTo,
}: ReturnType<typeof usePeriod>) {
  const chips: { key: Period; label: string }[] = [
    { key: 'day', label: '日別' },
    { key: 'week', label: '今週' },
    { key: 'month', label: '今月' },
    { key: 'last_month', label: '先月' },
    { key: 'custom', label: 'カスタム' },
  ]
  return (
    <div className="flex items-center gap-3 mb-6 flex-wrap">
      {chips.map((c) => (
        <button
          key={c.key}
          onClick={() => setPeriod(c.key)}
          className="px-4 py-2 rounded-lg text-sm font-bold transition-all"
          style={
            period === c.key
              ? { background: '#b8963e', color: '#fff', boxShadow: '0 2px 8px rgba(184,150,62,0.25)' }
              : { background: '#f3f4f6', color: '#6b7280' }
          }
        >
          {c.label}
        </button>
      ))}
      {period === 'day' && (
        <input
          type="date"
          value={dayDate}
          onChange={(e) => setDayDate(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm focus:outline-none ml-2"
          style={{ border: '1.5px solid #e5e7eb', color: '#1f2937' }}
        />
      )}
      {period === 'custom' && (
        <div className="flex items-center gap-2 ml-2">
          <input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm focus:outline-none"
            style={{ border: '1.5px solid #e5e7eb', color: '#1f2937' }}
          />
          <span style={{ color: '#6b7280' }}>〜</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm focus:outline-none"
            style={{ border: '1.5px solid #e5e7eb', color: '#1f2937' }}
          />
        </div>
      )}
    </div>
  )
}

function NoData() {
  return (
    <div className="flex items-center justify-center py-12" style={{ color: '#6b7280' }}>
      データがありません
    </div>
  )
}

// ── 前期間レンジ計算 ──
function getPrevRange(from: string, to: string, period: Period): [string, string] {
  const fromD = new Date(from)
  const toD = new Date(to)
  if (period === 'day') {
    fromD.setDate(fromD.getDate() - 1)
    return [fmtDateSimple(fromD), fmtDateSimple(fromD)]
  }
  if (period === 'month' || period === 'last_month') {
    const first = new Date(fromD.getFullYear(), fromD.getMonth() - 1, 1)
    const last = new Date(fromD.getFullYear(), fromD.getMonth(), 0)
    return [fmtDateSimple(first), fmtDateSimple(last)]
  }
  // week / custom: 同じ日数分前へ
  const days = Math.round((toD.getTime() - fromD.getTime()) / 86400000) + 1
  const prevFrom = new Date(fromD); prevFrom.setDate(prevFrom.getDate() - days)
  const prevTo = new Date(fromD); prevTo.setDate(prevTo.getDate() - 1)
  return [fmtDateSimple(prevFrom), fmtDateSimple(prevTo)]
}

function fmtDateSimple(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ── 前期間比較カード ──
function CompareCard({ label, current, previous, unit }: { label: string; current: number; previous: number; unit: string }) {
  const diff = current - previous
  const pct = previous > 0 ? Math.round((diff / previous) * 1000) / 10 : null
  const isUp = diff > 0, isDown = diff < 0
  const color = isUp ? '#16a34a' : isDown ? '#dc2626' : '#9ca3af'
  const arrow = isUp ? '▲' : isDown ? '▼' : '—'
  return (
    <div className="rounded-2xl p-4" style={{ background: '#ffffff', border: '1px solid #e5e7eb' }}>
      <p className="text-xs font-bold tracking-[0.15em] uppercase mb-1" style={{ color: '#6b7280' }}>
        {label}
      </p>
      <div className="flex items-baseline gap-2">
        <p className="text-2xl font-bold" style={{ color: '#b8963e', fontFamily: "'DM Mono', monospace" }}>
          {(Math.round(current * 10) / 10).toFixed(1)}
          <span className="text-sm ml-1" style={{ color: '#6b7280' }}>{unit}</span>
        </p>
        <p className="text-xs font-bold" style={{ color, fontFamily: "'DM Mono', monospace" }}>
          {arrow} {Math.abs(Math.round(diff * 10) / 10).toFixed(1)}{unit}
          {pct !== null && ` (${pct > 0 ? '+' : ''}${pct}%)`}
        </p>
      </div>
      <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>
        前期間: {(Math.round(previous * 10) / 10).toFixed(1)}{unit}
      </p>
    </div>
  )
}

// ── 作業内容×場所クロステーブル ──
function CrossTable({ reports }: { reports: any[] }) {
  const { workTypes, locations, matrix } = useMemo(() => {
    const wtSet = new Set<string>(), locSet = new Set<string>()
    const map: Record<string, Record<string, number>> = {}
    reports.forEach((r: any) => {
      if (!r.work_type || !r.location) return
      wtSet.add(r.work_type); locSet.add(r.location)
      if (!map[r.work_type]) map[r.work_type] = {}
      map[r.work_type][r.location] = (map[r.work_type][r.location] || 0) + Number(r.hours || 0)
    })
    return {
      workTypes: Array.from(wtSet).sort(),
      locations: Array.from(locSet).sort(),
      matrix: map,
    }
  }, [reports])

  if (workTypes.length === 0) return <NoData />
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
            <th className="text-left py-2 px-3 font-bold" style={{ color: '#4b5563' }}>作業内容＼場所</th>
            {locations.map((l) => (
              <th key={l} className="text-center py-2 px-3 font-bold" style={{ color: '#4b5563' }}>{l}</th>
            ))}
            <th className="text-center py-2 px-3 font-bold" style={{ color: '#b8963e' }}>計</th>
          </tr>
        </thead>
        <tbody>
          {workTypes.map((wt) => {
            const row = matrix[wt] || {}
            const total = locations.reduce((s, l) => s + (row[l] || 0), 0)
            return (
              <tr key={wt} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td className="py-2 px-3 font-medium" style={{ color: '#1f2937' }}>{wt}</td>
                {locations.map((l) => {
                  const v = row[l] || 0
                  return (
                    <td key={l} className="text-center py-2 px-3" style={{ color: v > 0 ? '#1f2937' : '#d1d5db', fontFamily: "'DM Mono', monospace" }}>
                      {v > 0 ? (Math.round(v * 10) / 10).toFixed(1) : '—'}
                    </td>
                  )
                })}
                <td className="text-center py-2 px-3 font-bold" style={{ color: '#b8963e', fontFamily: "'DM Mono', monospace" }}>
                  {(Math.round(total * 10) / 10).toFixed(1)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── セクション1: 作業時間サマリ ──
function WorkTimeSummary() {
  const periodState = usePeriod('month')
  const [byType, setByType] = useState<any[]>([])
  const [byEmp, setByEmp] = useState<any[]>([])
  const [byDay, setByDay] = useState<any[]>([])
  const [rawReports, setRawReports] = useState<any[]>([])
  const [prevTotal, setPrevTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const [from, to] = periodState.range()
      const [prevFrom, prevTo] = getPrevRange(from, to, periodState.period)
      const supabase = createClient()
      const [t, e, d, raw, prev] = await Promise.all([
        fetchWorkByType(from, to),
        fetchWorkByEmployee(from, to),
        fetchWorkByDay(from, to),
        supabase
          .from('work_reports')
          .select('work_type, hours, location')
          .gte('reported_at', `${from}T00:00:00+09:00`)
          .lte('reported_at', `${to}T23:59:59+09:00`),
        supabase
          .from('work_reports')
          .select('hours')
          .gte('reported_at', `${prevFrom}T00:00:00+09:00`)
          .lte('reported_at', `${prevTo}T23:59:59+09:00`),
      ])
      setByType(t)
      setByEmp(e)
      setByDay(d)
      setRawReports(raw.data || [])
      const prevSum = (prev.data || []).reduce((s: number, r: any) => s + Number(r.hours || 0), 0)
      setPrevTotal(Math.round(prevSum * 10) / 10)
      setLoading(false)
    }
    load()
  }, [periodState.range, periodState.period])

  const currentTotal = useMemo(() => {
    const sum = byType.reduce((s, t) => s + Number(t.hours || 0), 0)
    return Math.round(sum * 10) / 10
  }, [byType])

  const [csvLoading, setCsvLoading] = useState(false)
  const downloadWorkCsv = async () => {
    setCsvLoading(true)
    const [from, to] = periodState.range()
    const supabase = createClient()
    const { data, error } = await supabase
      .from('work_reports')
      .select('reported_at, work_type, work_category, hours, location, plant_count_1f, plant_count_2f, plant_count_3f, plant_count_4f, plant_count_5f, plant_count_5f_over, unit_count, bend_count, pole_count, created_at, employees(name)')
      .gte('reported_at', `${from}T00:00:00+09:00`)
      .lte('reported_at', `${to}T23:59:59+09:00`)
      .order('reported_at')
    setCsvLoading(false)
    if (error) { alert('CSV取得に失敗しました: ' + error.message); return }
    if (!data || data.length === 0) { alert('データがありません'); return }
    const header = [
      '日付', '時刻', '氏名', '作業内容', 'カテゴリ', '時間(h)', '場所',
      '個数1F', '個数2F', '個数3F', '個数4F', '個数5F', '個数5F+',
      '個数(スライダー)', '曲げ数', '立て数', '登録日時',
    ]
    const rows = data.map((r: any) => {
      const dt = new Date(r.reported_at)
      const date = `${dt.getFullYear()}/${String(dt.getMonth()+1).padStart(2,'0')}/${String(dt.getDate()).padStart(2,'0')}`
      const time = `${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`
      const created = r.created_at ? new Date(r.created_at).toLocaleString('ja-JP') : ''
      return [
        date, time, r.employees?.name || '', r.work_type, r.work_category, r.hours, r.location ?? '',
        r.plant_count_1f ?? '', r.plant_count_2f ?? '', r.plant_count_3f ?? '',
        r.plant_count_4f ?? '', r.plant_count_5f ?? '', r.plant_count_5f_over ?? '',
        r.unit_count ?? '', r.bend_count ?? '', r.pole_count ?? '', created,
      ]
    })
    downloadCsv(`作業時間ローデータ_${from}_${to}.csv`, [header, ...rows])
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold" style={{ color: '#1f2937' }}>
          <span className="mr-2">⏱</span>作業時間サマリ
        </h2>
        <CsvButton onClick={downloadWorkCsv} loading={csvLoading} />
      </div>
      <PeriodSelector {...periodState} />

      {loading ? (
        <div className="text-center py-8" style={{ color: '#6b7280' }}>読み込み中...</div>
      ) : (
        <>
          {/* 前期間比較 */}
          <div className="mb-6">
            <CompareCard label="作業時間（前期間比）" current={currentTotal} previous={prevTotal} unit="h" />
          </div>

        <div className="grid grid-cols-2 gap-6">
          <Card title="作業内容別 合計時間">
            {byType.length === 0 ? <NoData /> : (
              <ResponsiveContainer width="100%" height={Math.max(200, byType.length * 36)}>
                <BarChart data={byType} layout="vertical" margin={{ left: 100, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 12 }} unit="h" />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#1f2937', fontSize: 12 }} width={95} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb' }}
                    formatter={(v: any) => [`${v}h`, '時間']}
                  />
                  <Bar dataKey="hours" fill="#b8963e" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>

          <Card title="従業員別 合計時間">
            {byEmp.length === 0 ? <NoData /> : (
              <ResponsiveContainer width="100%" height={Math.max(200, byEmp.length * 48)}>
                <BarChart data={byEmp} layout="vertical" margin={{ left: 80, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 12 }} unit="h" />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#1f2937', fontSize: 12 }} width={75} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb' }}
                    formatter={(v: any) => [`${v}h`, '時間']}
                  />
                  <Bar dataKey="hours" fill="#d4b96a" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>

          <div className="col-span-2">
            <Card title="日別 総作業時間">
              {byDay.length === 0 ? <NoData /> : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={byDay} margin={{ left: 10, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: '#6b7280', fontSize: 11 }}
                      tickFormatter={(v: string) => v.slice(5)}
                    />
                    <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} unit="h" />
                    <Tooltip
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb' }}
                      formatter={(v: any) => [`${v}h`, '時間']}
                      labelFormatter={(l: any) => `${l}`}
                    />
                    <Line
                      type="monotone"
                      dataKey="hours"
                      stroke="#b8963e"
                      strokeWidth={2.5}
                      dot={{ fill: '#b8963e', r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </Card>
          </div>

          <div className="col-span-2">
            <Card title="作業内容 × 場所 クロス集計（時間）">
              <CrossTable reports={rawReports} />
            </Card>
          </div>
        </div>
        </>
      )}
    </div>
  )
}

// ── セクション2: ロス分析 ──
function LossAnalysis() {
  const periodState = usePeriod('month')
  const [byVariety, setByVariety] = useState<any[]>([])
  const [discardReasons, setDiscardReasons] = useState<any[]>([])
  const [downgradeReasons, setDowngradeReasons] = useState<any[]>([])
  const [trend, setTrend] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const [from, to] = periodState.range()
      const [v, dr, dgr, t] = await Promise.all([
        fetchLossByVariety(from, to),
        fetchLossByReason(from, to, 'discard'),
        fetchLossByReason(from, to, 'downgrade'),
        fetchLossMonthlyTrend(6),
      ])
      setByVariety(v)
      setDiscardReasons(dr)
      setDowngradeReasons(dgr)
      setTrend(t)
      setLoading(false)
    }
    load()
  }, [periodState.range])

  const renderPie = (data: any[], title: string, color: string) => (
    <div>
      <p className="text-sm font-bold mb-2 text-center" style={{ color }}>{title}</p>
      {data.length === 0 ? <NoData /> : (
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={90}
              label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
              labelLine={{ stroke: '#9ca3af' }}
              fontSize={11}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS_EXTENDED[i % COLORS_EXTENDED.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb' }}
              formatter={(v: any) => [`${v}件`, '数量']}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  )

  const [csvLoading, setCsvLoading] = useState(false)
  const downloadLossCsv = async () => {
    setCsvLoading(true)
    const [from, to] = periodState.range()
    const supabase = createClient()
    const { data: reps, error: e1 } = await supabase
      .from('loss_reports')
      .select('id, work_date, employee_id, greenhouses, positions, seedling_arrival_date, memo, created_at, employees(name)')
      .gte('work_date', from)
      .lte('work_date', to)
      .order('work_date')
    if (e1) { setCsvLoading(false); alert('CSV取得に失敗しました: ' + e1.message); return }
    if (!reps || reps.length === 0) { setCsvLoading(false); alert('データがありません'); return }
    const ids = reps.map((r: any) => r.id)
    const { data: items, error: e2 } = await supabase
      .from('loss_report_items')
      .select('loss_report_id, variety, loss_type, reason, quantity')
      .in('loss_report_id', ids)
    setCsvLoading(false)
    if (e2) { alert('明細取得に失敗しました: ' + e2.message); return }

    const header = ['作業日', '氏名', '温室', '作業区域', '苗入荷日', '品種', '破棄/B・C品', '理由', '数量', 'メモ', '登録日時']
    const rows: (string | number | null)[][] = []
    reps.forEach((r: any) => {
      const repItems = (items || []).filter((i: any) => i.loss_report_id === r.id)
      const base = [
        r.work_date,
        r.employees?.name || '',
        (r.greenhouses || []).join('/'),
        (r.positions || []).join('/'),
        r.seedling_arrival_date || '',
      ]
      const created = r.created_at ? new Date(r.created_at).toLocaleString('ja-JP') : ''
      if (repItems.length === 0) {
        rows.push([...base, '', '', '', '', r.memo || '', created])
      } else {
        repItems.forEach((i: any) => {
          rows.push([
            ...base,
            i.variety,
            i.loss_type === 'discard' ? '破棄' : 'B・C品',
            i.reason,
            i.quantity,
            r.memo || '',
            created,
          ])
        })
      }
    })
    downloadCsv(`ロス報告ローデータ_${from}_${to}.csv`, [header, ...rows])
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold" style={{ color: '#1f2937' }}>
          <span className="mr-2">⚠️</span>ロス分析
        </h2>
        <CsvButton onClick={downloadLossCsv} loading={csvLoading} />
      </div>
      <PeriodSelector {...periodState} />

      {loading ? (
        <div className="text-center py-8" style={{ color: '#6b7280' }}>読み込み中...</div>
      ) : (
        <div className="grid grid-cols-2 gap-6">
          <div className="col-span-2">
            <Card title="品種別 破棄/B・C品数">
              {byVariety.length === 0 ? <NoData /> : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={byVariety} margin={{ left: 20, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="variety" tick={{ fill: '#1f2937', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb' }}
                    />
                    <Legend />
                    <Bar dataKey="discard" name="破棄" stackId="a" fill="#dc2626" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="downgrade" name="B・C品" stackId="a" fill="#d97706" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>
          </div>

          <Card title="理由別内訳">
            <div className="grid grid-cols-2 gap-4">
              {renderPie(discardReasons, '● 破棄', '#dc2626')}
              {renderPie(downgradeReasons, '● B・C品', '#d97706')}
            </div>
          </Card>

          <Card title="月次推移（過去6ヶ月）">
            {trend.every((t) => t.discard === 0 && t.downgrade === 0) ? <NoData /> : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={trend} margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb' }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="discard" name="破棄" stroke="#dc2626" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="downgrade" name="B・C品" stroke="#d97706" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}

// ── セクション3: 出勤状況 ──
function AttendanceSummary() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const result = await fetchAttendanceMonth(year, month)
      setData(result)
      setLoading(false)
    }
    load()
  }, [year, month])

  const prevMonth = () => {
    if (month === 1) { setYear(year - 1); setMonth(12) }
    else setMonth(month - 1)
  }
  const nextMonth = () => {
    if (month === 12) { setYear(year + 1); setMonth(1) }
    else setMonth(month + 1)
  }

  // カレンダーヒートマップ
  const renderHeatmap = () => {
    if (!data || data.employees.length === 0) return <NoData />
    const lastDay = data.lastDay || new Date(year, month, 0).getDate()
    const days = Array.from({ length: lastDay }, (_, i) => i + 1)

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ minWidth: '800px' }}>
          <thead>
            <tr>
              <th className="text-left py-2 px-3 font-semibold" style={{ color: '#4b5563', width: '100px' }}>
                氏名
              </th>
              {days.map((d) => (
                <th
                  key={d}
                  className="text-center py-2 font-normal"
                  style={{ color: '#6b7280', fontSize: '11px', width: '28px' }}
                >
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.employees.map((emp: any) => (
              <tr key={emp.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                <td className="py-2 px-3 font-semibold" style={{ color: '#1f2937' }}>
                  {emp.name}
                </td>
                {days.map((d) => {
                  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
                  const worked = emp.dates.includes(dateStr)
                  return (
                    <td key={d} className="text-center py-2">
                      <div
                        className="w-5 h-5 rounded mx-auto"
                        style={{
                          background: worked ? '#b8963e' : '#f3f4f6',
                          opacity: worked ? 1 : 0.5,
                        }}
                      />
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  const [csvLoading, setCsvLoading] = useState(false)
  const downloadAttCsv = async () => {
    setCsvLoading(true)
    const from = `${year}-${String(month).padStart(2,'0')}-01`
    const lastDay = new Date(year, month, 0).getDate()
    const to = `${year}-${String(month).padStart(2,'0')}-${String(lastDay).padStart(2,'0')}`
    const supabase = createClient()
    const { data: tcs, error } = await supabase
      .from('timecards')
      .select('work_date, clock_in, clock_out, employees(name)')
      .gte('work_date', from)
      .lte('work_date', to)
      .order('work_date')
    setCsvLoading(false)
    if (error) { alert('CSV取得に失敗しました: ' + error.message); return }
    if (!tcs || tcs.length === 0) { alert('データがありません'); return }
    const header = ['日付', '氏名', '出勤時刻', '退勤時刻', '勤務時間(h)']
    const fmtT = (iso: string | null) => {
      if (!iso) return ''
      const d = new Date(iso)
      return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
    }
    const rows = tcs.map((t: any) => {
      let h: string | number = ''
      if (t.clock_in && t.clock_out) {
        const diff = (new Date(t.clock_out).getTime() - new Date(t.clock_in).getTime()) / 3600000
        h = (Math.round(diff * 10) / 10).toFixed(1)
      }
      return [t.work_date, t.employees?.name || '', fmtT(t.clock_in), fmtT(t.clock_out), h]
    })
    downloadCsv(`タイムカードローデータ_${year}-${String(month).padStart(2,'0')}.csv`, [header, ...rows])
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold" style={{ color: '#1f2937' }}>
          <span className="mr-2">⏰</span>出勤状況
        </h2>
        <CsvButton onClick={downloadAttCsv} loading={csvLoading} />
      </div>

      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={prevMonth}
          className="px-3 py-2 rounded-lg text-sm font-bold"
          style={{ background: '#f3f4f6', color: '#4b5563' }}
        >
          ◀
        </button>
        <span className="text-lg font-bold" style={{ color: '#1f2937', fontFamily: "'DM Mono', monospace" }}>
          {year}年{month}月
        </span>
        <button
          onClick={nextMonth}
          className="px-3 py-2 rounded-lg text-sm font-bold"
          style={{ background: '#f3f4f6', color: '#4b5563' }}
        >
          ▶
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8" style={{ color: '#6b7280' }}>読み込み中...</div>
      ) : (
        <div className="space-y-6">
          <Card title="出勤カレンダー">{renderHeatmap()}</Card>

          <Card title="月間集計">
            {!data || data.employees.length === 0 ? <NoData /> : (
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                    <th className="text-left py-3 px-4 font-bold" style={{ color: '#4b5563' }}>氏名</th>
                    <th className="text-center py-3 px-4 font-bold" style={{ color: '#4b5563' }}>出勤日数</th>
                    <th className="text-center py-3 px-4 font-bold" style={{ color: '#4b5563' }}>平均勤務時間</th>
                  </tr>
                </thead>
                <tbody>
                  {data.employees.map((emp: any) => (
                    <tr key={emp.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td className="py-3 px-4 font-semibold" style={{ color: '#1f2937' }}>{emp.name}</td>
                      <td className="text-center py-3 px-4" style={{ fontFamily: "'DM Mono', monospace", color: '#1f2937' }}>
                        {emp.days}日
                      </td>
                      <td className="text-center py-3 px-4" style={{ fontFamily: "'DM Mono', monospace", color: '#1f2937' }}>
                        {emp.avgHours > 0 ? `${emp.avgHours}h` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}

// ── メインページ ──
const SECTIONS = [
  { id: 'work', label: '作業時間', icon: '⏱' },
  { id: 'loss', label: 'ロス', icon: '⚠️' },
  { id: 'attendance', label: '出勤', icon: '⏰' },
]

function LiveClock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  const p = (n: number) => String(n).padStart(2, '0')
  const fmt = `${now.getFullYear()}/${p(now.getMonth() + 1)}/${p(now.getDate())} ${p(now.getHours())}:${p(now.getMinutes())}:${p(now.getSeconds())}`
  return (
    <div
      className="inline-block px-4 py-2 rounded-lg text-base font-bold mb-4"
      style={{
        background: '#faf6ed',
        color: '#b8963e',
        border: '1.5px solid #e8dcc3',
        fontFamily: "'DM Mono', monospace",
      }}
    >
      🕐 {fmt}
    </div>
  )
}

export default function AnalyticsView() {
  const [section, setSection] = useState('work')

  return (
    <div className="h-full overflow-y-auto" style={{ animation: 'fadeIn 0.3s' }}>
      <LiveClock />

      {/* サブタブ */}
      <div className="flex items-center gap-2 mb-6">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => setSection(s.id)}
            className="px-5 py-2.5 rounded-xl text-sm font-bold transition-all"
            style={
              section === s.id
                ? { background: '#faf6ed', color: '#b8963e', border: '1.5px solid #e8dcc3' }
                : { background: '#f3f4f6', color: '#6b7280', border: '1.5px solid transparent' }
            }
          >
            <span className="mr-1.5">{s.icon}</span>
            {s.label}
          </button>
        ))}
      </div>

      {/* コンテンツ */}
      {section === 'work' && <WorkTimeSummary />}
      {section === 'loss' && <LossAnalysis />}
      {section === 'attendance' && <AttendanceSummary />}
    </div>
  )
}
