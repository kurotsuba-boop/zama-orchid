'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line,
} from 'recharts'
import { createClient } from '@/lib/supabase'
import { useEmployees } from '@/hooks/useEmployees'
import DatePicker from '@/components/DatePicker'

// ── 定数 ──
const GOLD = '#b8963e'
const GOLD_LIGHT = '#d4b96a'

// ── ユーティリティ ──
function pad(n: number) {
  return String(n).padStart(2, '0')
}
function fmtDate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
function getToday() {
  return fmtDate(new Date())
}
function getMondayOfDate(d: Date) {
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(d.getFullYear(), d.getMonth(), diff)
}
function diffHours(clockIn: string, clockOut: string) {
  return (new Date(clockOut).getTime() - new Date(clockIn).getTime()) / 3600000
}
function fmtTimeOnly(iso: string | null) {
  if (!iso) return '--:--'
  const d = new Date(iso)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}
function round1(n: number) {
  return Math.round(n * 10) / 10
}
function formatRangeLabel(from: string, to: string) {
  if (from === to) {
    const d = new Date(from)
    return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}`
  }
  const f = new Date(from), t = new Date(to)
  return `${pad(f.getMonth() + 1)}/${pad(f.getDate())} 〜 ${pad(t.getMonth() + 1)}/${pad(t.getDate())}`
}

// ── 型 ──
type ViewTab = 'personal' | 'overall'
type Period = 'day' | 'week' | 'month'
type Side = 'this' | 'last'

// ── 共通UI ──
function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: '#ffffff', border: '1px solid #e5e7eb' }}>
      {title && <p className="text-sm font-bold mb-3" style={{ color: '#1f2937' }}>{title}</p>}
      {children}
    </div>
  )
}

function ChipBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2 rounded-lg text-sm font-bold transition-all active:scale-95"
      style={
        active
          ? { background: GOLD, color: '#fff', boxShadow: '0 2px 8px rgba(184,150,62,0.25)' }
          : { background: '#f3f4f6', color: '#9ca3af' }
      }
    >
      {children}
    </button>
  )
}

function StatCard({ label, value, unit }: { label: string; value: string | number; unit?: string }) {
  return (
    <div className="rounded-2xl p-4 text-center" style={{ background: '#ffffff', border: '1px solid #e5e7eb' }}>
      <p className="text-xs font-bold tracking-[0.15em] uppercase mb-1.5" style={{ color: '#9ca3af' }}>
        {label}
      </p>
      <p className="text-3xl font-bold" style={{ color: GOLD, fontFamily: "'DM Mono', monospace" }}>
        {value}
        {unit && <span className="text-base ml-1" style={{ color: '#9ca3af' }}>{unit}</span>}
      </p>
    </div>
  )
}

function NoData() {
  return (
    <div className="text-center py-8 text-sm" style={{ color: '#9ca3af' }}>
      データがありません
    </div>
  )
}

// ── 集計ユーティリティ ──
function aggregateByType(reports: any[]) {
  const map: Record<string, number> = {}
  reports.forEach((r) => {
    map[r.work_type] = (map[r.work_type] || 0) + Number(r.hours || 0)
  })
  return Object.entries(map)
    .map(([name, hours]) => ({ name, hours: round1(hours) }))
    .sort((a, b) => b.hours - a.hours)
}

function aggregateByDay(reports: any[]) {
  const map: Record<string, number> = {}
  reports.forEach((r) => {
    const d = String(r.reported_at).slice(0, 10)
    map[d] = (map[d] || 0) + Number(r.hours || 0)
  })
  return Object.entries(map)
    .map(([date, hours]) => ({ date, hours: round1(hours) }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

function aggregateByEmployee(reports: any[]) {
  const map: Record<string, { name: string; hours: number }> = {}
  reports.forEach((r) => {
    const id = r.employee_id
    if (!map[id]) map[id] = { name: r.employees?.name || '不明', hours: 0 }
    map[id].hours += Number(r.hours || 0)
  })
  return Object.values(map)
    .map((v) => ({ name: v.name, hours: round1(v.hours) }))
    .sort((a, b) => b.hours - a.hours)
}

function aggregateAttendance(timecards: any[]) {
  const map: Record<string, { name: string; days: Set<string>; totalHours: number }> = {}
  timecards.forEach((t) => {
    if (!t.clock_in) return
    const id = t.employee_id
    if (!map[id]) map[id] = { name: t.employees?.name || '不明', days: new Set(), totalHours: 0 }
    map[id].days.add(t.work_date)
    if (t.clock_in && t.clock_out) {
      map[id].totalHours += diffHours(t.clock_in, t.clock_out)
    }
  })
  return Object.entries(map).map(([id, v]) => ({
    id,
    name: v.name,
    days: v.days.size,
    totalHours: round1(v.totalHours),
    avgHours: v.days.size > 0 ? round1(v.totalHours / v.days.size) : 0,
  }))
}

// ════════════════════════════════════════════
// メインコンポーネント
// ════════════════════════════════════════════
export default function MyAnalytics({ employeeId }: { employeeId: string }) {
  const { employees } = useEmployees()
  const [view, setView] = useState<ViewTab>('personal')
  const [period, setPeriod] = useState<Period>('day')
  const [dayDate, setDayDate] = useState(getToday())
  const [weekSide, setWeekSide] = useState<Side>('this')
  const [monthSide, setMonthSide] = useState<Side>('this')

  // 期間範囲
  const [from, to, rangeLabel] = useMemo<[string, string, string]>(() => {
    if (period === 'day') {
      return [dayDate, dayDate, formatRangeLabel(dayDate, dayDate)]
    }
    if (period === 'week') {
      const base = new Date()
      if (weekSide === 'last') base.setDate(base.getDate() - 7)
      const mon = getMondayOfDate(base)
      const sun = new Date(mon)
      sun.setDate(mon.getDate() + 6)
      return [fmtDate(mon), fmtDate(sun), formatRangeLabel(fmtDate(mon), fmtDate(sun))]
    }
    // month
    const base = new Date()
    if (monthSide === 'last') base.setMonth(base.getMonth() - 1)
    const first = new Date(base.getFullYear(), base.getMonth(), 1)
    const last = new Date(base.getFullYear(), base.getMonth() + 1, 0)
    return [fmtDate(first), fmtDate(last), `${base.getFullYear()}年${base.getMonth() + 1}月`]
  }, [period, dayDate, weekSide, monthSide])

  // データ取得
  const [reports, setReports] = useState<any[]>([])
  const [timecards, setTimecards] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // 個人ビューで未選択の場合は取得しない
    if (view === 'personal' && !employeeId) {
      setReports([])
      setTimecards([])
      return
    }
    const load = async () => {
      setLoading(true)
      const supabase = createClient()
      let rq = supabase
        .from('work_reports')
        .select('*, employees(name)')
        .gte('reported_at', `${from}T00:00:00+09:00`)
        .lte('reported_at', `${to}T23:59:59+09:00`)
      let tq = supabase
        .from('timecards')
        .select('*, employees(name)')
        .gte('work_date', from)
        .lte('work_date', to)
      if (view === 'personal' && employeeId) {
        rq = rq.eq('employee_id', employeeId)
        tq = tq.eq('employee_id', employeeId)
      }
      const [r, t] = await Promise.all([rq, tq])
      setReports(r.data || [])
      setTimecards(t.data || [])
      setLoading(false)
    }
    load()
  }, [view, period, from, to, employeeId])

  const empName = employees.find((e) => e.id === employeeId)?.name || ''

  // ──────────────────────────────────────────
  // 個人ビュー: 未選択ガード
  // ──────────────────────────────────────────
  if (view === 'personal' && !employeeId) {
    return (
      <div className="h-full overflow-y-auto" style={{ animation: 'fadeIn 0.3s' }}>
        <ViewTabs view={view} setView={setView} />
        <div className="flex items-center justify-center" style={{ minHeight: '400px' }}>
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
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto" style={{ animation: 'fadeIn 0.3s' }}>
      {/* ビュータブ */}
      <ViewTabs view={view} setView={setView} />

      {/* 期間切替 */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <ChipBtn active={period === 'day'} onClick={() => setPeriod('day')}>日別</ChipBtn>
        <ChipBtn active={period === 'week'} onClick={() => setPeriod('week')}>週次</ChipBtn>
        <ChipBtn active={period === 'month'} onClick={() => setPeriod('month')}>月次</ChipBtn>

        <span className="mx-2" style={{ color: '#d1d5db' }}>|</span>

        {period === 'day' && (
          <div className="w-44">
            <DatePicker value={dayDate} onChange={setDayDate} />
          </div>
        )}
        {period === 'week' && (
          <>
            <ChipBtn active={weekSide === 'this'} onClick={() => setWeekSide('this')}>今週</ChipBtn>
            <ChipBtn active={weekSide === 'last'} onClick={() => setWeekSide('last')}>先週</ChipBtn>
            <span className="text-xs ml-2" style={{ color: '#6b7280', fontFamily: "'DM Mono', monospace" }}>
              {rangeLabel}
            </span>
          </>
        )}
        {period === 'month' && (
          <>
            <ChipBtn active={monthSide === 'this'} onClick={() => setMonthSide('this')}>今月</ChipBtn>
            <ChipBtn active={monthSide === 'last'} onClick={() => setMonthSide('last')}>先月</ChipBtn>
            <span className="text-xs ml-2" style={{ color: '#6b7280', fontFamily: "'DM Mono', monospace" }}>
              {rangeLabel}
            </span>
          </>
        )}
      </div>

      {/* コンテンツ */}
      {loading ? (
        <div className="text-center py-12 text-sm" style={{ color: '#9ca3af' }}>
          読み込み中...
        </div>
      ) : view === 'personal' ? (
        <PersonalContent
          period={period}
          empName={empName}
          dayDate={dayDate}
          from={from}
          to={to}
          reports={reports}
          timecards={timecards}
        />
      ) : (
        <OverallContent
          period={period}
          dayDate={dayDate}
          from={from}
          to={to}
          reports={reports}
          timecards={timecards}
        />
      )}
    </div>
  )
}

// ── ビュータブ ──
function ViewTabs({ view, setView }: { view: ViewTab; setView: (v: ViewTab) => void }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      {(['personal', 'overall'] as const).map((v) => {
        const label = v === 'personal' ? '👤 自分の実績' : '🏢 全体の進捗'
        return (
          <button
            key={v}
            onClick={() => setView(v)}
            className="px-5 py-2.5 rounded-xl text-sm font-bold transition-all"
            style={
              view === v
                ? { background: '#faf6ed', color: GOLD, border: '1.5px solid #e8dcc3' }
                : { background: '#f3f4f6', color: '#9ca3af', border: '1.5px solid transparent' }
            }
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

// ════════════════════════════════════════════
// 個人実績
// ════════════════════════════════════════════
function PersonalContent({
  period, empName, dayDate, from, to, reports, timecards,
}: {
  period: Period
  empName: string
  dayDate: string
  from: string
  to: string
  reports: any[]
  timecards: any[]
}) {
  // 集計
  const byType = useMemo(() => aggregateByType(reports), [reports])
  const byDay = useMemo(() => aggregateByDay(reports), [reports])
  const totalHours = useMemo(() => round1(reports.reduce((s, r) => s + Number(r.hours || 0), 0)), [reports])

  // 勤怠サマリ
  const attendanceSummary = useMemo(() => {
    if (period === 'day') {
      const t = timecards[0]
      const work =
        t && t.clock_in && t.clock_out
          ? round1(diffHours(t.clock_in, t.clock_out))
          : null
      return { type: 'day' as const, clockIn: t?.clock_in || null, clockOut: t?.clock_out || null, workHours: work }
    }
    // week / month
    const validTcs = timecards.filter((t) => t.clock_in)
    const totalH = validTcs.reduce((s, t) => s + (t.clock_out ? diffHours(t.clock_in, t.clock_out) : 0), 0)
    const days = new Set(validTcs.map((t) => t.work_date)).size
    return {
      type: 'range' as const,
      days,
      totalHours: round1(totalH),
      avgHours: days > 0 ? round1(totalH / days) : 0,
    }
  }, [period, timecards])

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-semibold" style={{ color: '#1f2937' }}>
        {empName} さんの実績
      </p>

      {/* 勤怠サマリ */}
      <div className="grid grid-cols-3 gap-3">
        {attendanceSummary.type === 'day' ? (
          <>
            <StatCard label="出勤時刻" value={fmtTimeOnly(attendanceSummary.clockIn)} />
            <StatCard label="退勤時刻" value={fmtTimeOnly(attendanceSummary.clockOut)} />
            <StatCard
              label="勤務時間"
              value={attendanceSummary.workHours !== null ? attendanceSummary.workHours.toFixed(1) : '—'}
              unit={attendanceSummary.workHours !== null ? 'h' : undefined}
            />
          </>
        ) : (
          <>
            <StatCard label="出勤日数" value={attendanceSummary.days} unit="日" />
            <StatCard label="合計勤務時間" value={attendanceSummary.totalHours.toFixed(1)} unit="h" />
            <StatCard label="平均勤務時間" value={attendanceSummary.avgHours.toFixed(1)} unit="h/日" />
          </>
        )}
      </div>

      {/* 作業内容 */}
      {period === 'day' ? (
        <Card title="作業内容">
          {reports.length === 0 ? <NoData /> : (
            <WorkTable rows={reports.map((r) => ({
              name: r.work_type,
              hours: Number(r.hours),
              location: r.location || '—',
            }))} />
          )}
        </Card>
      ) : (
        <>
          <Card title={`作業内容別 時間内訳 (合計 ${totalHours.toFixed(1)}h)`}>
            {byType.length === 0 ? <NoData /> : (
              <ResponsiveContainer width="100%" height={Math.max(180, byType.length * 32)}>
                <BarChart data={byType} layout="vertical" margin={{ left: 110, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 11 }} unit="h" />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#1f2937', fontSize: 11 }} width={105} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb' }}
                    formatter={(v: any) => [`${v}h`, '時間']}
                  />
                  <Bar dataKey="hours" fill={GOLD} radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>

          {period === 'month' && (
            <Card title="日別 作業時間 推移">
              {byDay.length === 0 ? <NoData /> : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={byDay} margin={{ left: 10, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: '#6b7280', fontSize: 10 }}
                      tickFormatter={(v: string) => v.slice(5)}
                    />
                    <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} unit="h" />
                    <Tooltip
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb' }}
                      formatter={(v: any) => [`${v}h`, '時間']}
                    />
                    <Line type="monotone" dataKey="hours" stroke={GOLD} strokeWidth={2.5} dot={{ fill: GOLD, r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </Card>
          )}
        </>
      )}

      {/* 作業履歴 (期間内すべて、日付グループ化) */}
      <Card title="作業履歴">
        <WorkHistory reports={reports} />
      </Card>
    </div>
  )
}

// ── 株数等のサマリ ──
function summarizeExtras(r: any): string {
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
    parts.push('株:' + floors.map(([k, v]) => `${k}${v}`).join('/'))
  }
  if (r.bend_count && Number(r.bend_count) > 0) parts.push(`曲げ${r.bend_count}本`)
  if (r.pole_count && Number(r.pole_count) > 0) parts.push(`立て${r.pole_count}本`)
  return parts.join(' · ')
}

// ── 作業履歴 (日付グループ化、新しい順) ──
function WorkHistory({ reports }: { reports: any[] }) {
  const groups = useMemo(() => {
    const map: Record<string, any[]> = {}
    reports.forEach((r) => {
      const d = String(r.reported_at).slice(0, 10)
      if (!map[d]) map[d] = []
      map[d].push(r)
    })
    // 各日内は登録順 (created_at)
    Object.values(map).forEach((arr) =>
      arr.sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))
    )
    return map
  }, [reports])

  const dates = useMemo(
    () => Object.keys(groups).sort((a, b) => b.localeCompare(a)),
    [groups]
  )

  if (dates.length === 0) return <NoData />

  const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

  return (
    <div className="flex flex-col gap-4">
      {dates.map((d) => {
        const date = new Date(d)
        const sum = groups[d].reduce((s, r) => s + Number(r.hours || 0), 0)
        return (
          <div key={d}>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-sm font-bold" style={{ color: GOLD }}>
                {date.getMonth() + 1}/{date.getDate()}（{WEEKDAYS[date.getDay()]}）
              </p>
              <p className="text-xs font-bold" style={{ color: GOLD, fontFamily: "'DM Mono', monospace" }}>
                計 {round1(sum).toFixed(1)}h
              </p>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <th className="text-left py-1.5 px-3 font-semibold text-xs" style={{ color: '#9ca3af' }}>作業内容</th>
                  <th className="text-center py-1.5 px-3 font-semibold text-xs w-20" style={{ color: '#9ca3af' }}>時間</th>
                  <th className="text-left py-1.5 px-3 font-semibold text-xs w-28" style={{ color: '#9ca3af' }}>場所</th>
                  <th className="text-left py-1.5 px-3 font-semibold text-xs" style={{ color: '#9ca3af' }}>詳細</th>
                </tr>
              </thead>
              <tbody>
                {groups[d].map((r, i) => {
                  const extras = summarizeExtras(r)
                  return (
                    <tr key={r.id || i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td className="py-2 px-3 font-medium" style={{ color: '#1f2937' }}>{r.work_type}</td>
                      <td className="text-center py-2 px-3" style={{ color: GOLD, fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>
                        {Number(r.hours).toFixed(1)}h
                      </td>
                      <td className="py-2 px-3 text-xs" style={{ color: '#6b7280' }}>{r.location || '—'}</td>
                      <td className="py-2 px-3 text-xs" style={{ color: '#9ca3af' }}>{extras || '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      })}
    </div>
  )
}

// ── 作業テーブル ──
function WorkTable({ rows }: { rows: { name: string; hours: number; location: string }[] }) {
  if (rows.length === 0) return <NoData />
  const total = rows.reduce((s, r) => s + r.hours, 0)
  return (
    <table className="w-full text-sm">
      <thead>
        <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
          <th className="text-left py-2 px-3 font-bold" style={{ color: '#6b7280' }}>作業</th>
          <th className="text-center py-2 px-3 font-bold w-24" style={{ color: '#6b7280' }}>時間</th>
          <th className="text-left py-2 px-3 font-bold w-32" style={{ color: '#6b7280' }}>場所</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
            <td className="py-2 px-3" style={{ color: '#1f2937' }}>{r.name}</td>
            <td className="text-center py-2 px-3" style={{ color: GOLD, fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>
              {r.hours.toFixed(1)}h
            </td>
            <td className="py-2 px-3" style={{ color: '#6b7280' }}>{r.location}</td>
          </tr>
        ))}
        <tr style={{ background: '#faf6ed' }}>
          <td className="py-2 px-3 font-bold" style={{ color: GOLD }}>合計</td>
          <td className="text-center py-2 px-3 font-bold" style={{ color: GOLD, fontFamily: "'DM Mono', monospace" }}>
            {total.toFixed(1)}h
          </td>
          <td></td>
        </tr>
      </tbody>
    </table>
  )
}

// ════════════════════════════════════════════
// 全体進捗（従業員別情報を含まないシンプル集計）
// ════════════════════════════════════════════
function OverallContent({
  period, dayDate, from, to, reports, timecards,
}: {
  period: Period
  dayDate: string
  from: string
  to: string
  reports: any[]
  timecards: any[]
}) {
  const totalHours = useMemo(() => round1(reports.reduce((s, r) => s + Number(r.hours || 0), 0)), [reports])
  const byType = useMemo(() => aggregateByType(reports), [reports])

  return (
    <div className="flex flex-col gap-3">
      {/* 集計サマリ */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="全体作業時間" value={totalHours.toFixed(1)} unit="h" />
        <StatCard label="登録件数" value={reports.length} unit="件" />
      </div>

      {/* 作業内容別: グラフ + テーブル */}
      <Card title="作業内容別 合計時間">
        {byType.length === 0 ? <NoData /> : (
          <>
            <ResponsiveContainer width="100%" height={Math.max(180, byType.length * 32)}>
              <BarChart data={byType} layout="vertical" margin={{ left: 110, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 11 }} unit="h" />
                <YAxis type="category" dataKey="name" tick={{ fill: '#1f2937', fontSize: 11 }} width={105} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb' }}
                  formatter={(v: any) => [`${v}h`, '時間']}
                />
                <Bar dataKey="hours" fill={GOLD} radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>

            <table className="w-full text-sm mt-4">
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                  <th className="text-left py-2 px-3 font-bold" style={{ color: '#6b7280' }}>作業内容</th>
                  <th className="text-center py-2 px-3 font-bold w-24" style={{ color: '#6b7280' }}>時間</th>
                </tr>
              </thead>
              <tbody>
                {byType.map((r, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td className="py-2 px-3" style={{ color: '#1f2937' }}>{r.name}</td>
                    <td className="text-center py-2 px-3" style={{ color: GOLD, fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>
                      {r.hours.toFixed(1)}h
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </Card>
    </div>
  )
}
