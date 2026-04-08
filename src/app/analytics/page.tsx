'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell,
} from 'recharts'
import {
  fetchWorkByType, fetchWorkByEmployee, fetchWorkByDay,
  fetchLossByVariety, fetchLossByReason, fetchLossMonthlyTrend,
  fetchAttendanceMonth,
} from '@/lib/analytics'

// ── カラーパレット ──
const COLORS = ['#b8963e', '#d4b96a', '#8b6f2f', '#c4a854', '#6b7280']
const COLORS_EXTENDED = [...COLORS, '#9ca3af', '#78716c', '#a8a29e', '#d97706', '#dc2626']

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

type Period = 'week' | 'month' | 'last_month' | 'custom'

function usePeriod(initial: Period = 'month') {
  const [period, setPeriod] = useState<Period>(initial)
  const [customFrom, setCustomFrom] = useState(getMonthStart())
  const [customTo, setCustomTo] = useState(getToday())

  const range = useCallback((): [string, string] => {
    switch (period) {
      case 'week': return [getMonday(), getToday()]
      case 'month': return [getMonthStart(), getToday()]
      case 'last_month': return getLastMonthRange()
      case 'custom': return [customFrom, customTo]
    }
  }, [period, customFrom, customTo])

  return { period, setPeriod, customFrom, setCustomFrom, customTo, setCustomTo, range }
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
  period, setPeriod, customFrom, setCustomFrom, customTo, setCustomTo,
}: ReturnType<typeof usePeriod>) {
  const chips: { key: Period; label: string }[] = [
    { key: 'week', label: '今週' },
    { key: 'month', label: '今月' },
    { key: 'last_month', label: '先月' },
    { key: 'custom', label: 'カスタム' },
  ]
  return (
    <div className="flex items-center gap-3 mb-6">
      {chips.map((c) => (
        <button
          key={c.key}
          onClick={() => setPeriod(c.key)}
          className="px-4 py-2 rounded-lg text-sm font-bold transition-all"
          style={
            period === c.key
              ? { background: '#b8963e', color: '#fff', boxShadow: '0 2px 8px rgba(184,150,62,0.25)' }
              : { background: '#f3f4f6', color: '#9ca3af' }
          }
        >
          {c.label}
        </button>
      ))}
      {period === 'custom' && (
        <div className="flex items-center gap-2 ml-2">
          <input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm focus:outline-none"
            style={{ border: '1.5px solid #e5e7eb', color: '#1f2937' }}
          />
          <span style={{ color: '#9ca3af' }}>〜</span>
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
    <div className="flex items-center justify-center py-12" style={{ color: '#9ca3af' }}>
      データがありません
    </div>
  )
}

// ── セクション1: 作業時間サマリ ──
function WorkTimeSummary() {
  const periodState = usePeriod('month')
  const [byType, setByType] = useState<any[]>([])
  const [byEmp, setByEmp] = useState<any[]>([])
  const [byDay, setByDay] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const [from, to] = periodState.range()
      const [t, e, d] = await Promise.all([
        fetchWorkByType(from, to),
        fetchWorkByEmployee(from, to),
        fetchWorkByDay(from, to),
      ])
      setByType(t)
      setByEmp(e)
      setByDay(d)
      setLoading(false)
    }
    load()
  }, [periodState.range])

  return (
    <div>
      <h2 className="text-xl font-bold mb-4" style={{ color: '#1f2937' }}>
        <span className="mr-2">⏱</span>作業時間サマリ
      </h2>
      <PeriodSelector {...periodState} />

      {loading ? (
        <div className="text-center py-8" style={{ color: '#9ca3af' }}>読み込み中...</div>
      ) : (
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
        </div>
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

  return (
    <div>
      <h2 className="text-xl font-bold mb-4" style={{ color: '#1f2937' }}>
        <span className="mr-2">⚠️</span>ロス分析
      </h2>
      <PeriodSelector {...periodState} />

      {loading ? (
        <div className="text-center py-8" style={{ color: '#9ca3af' }}>読み込み中...</div>
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
              <th className="text-left py-2 px-3 font-semibold" style={{ color: '#6b7280', width: '100px' }}>
                氏名
              </th>
              {days.map((d) => (
                <th
                  key={d}
                  className="text-center py-2 font-normal"
                  style={{ color: '#9ca3af', fontSize: '11px', width: '28px' }}
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

  return (
    <div>
      <h2 className="text-xl font-bold mb-4" style={{ color: '#1f2937' }}>
        <span className="mr-2">⏰</span>出勤状況
      </h2>

      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={prevMonth}
          className="px-3 py-2 rounded-lg text-sm font-bold"
          style={{ background: '#f3f4f6', color: '#6b7280' }}
        >
          ◀
        </button>
        <span className="text-lg font-bold" style={{ color: '#1f2937', fontFamily: "'DM Mono', monospace" }}>
          {year}年{month}月
        </span>
        <button
          onClick={nextMonth}
          className="px-3 py-2 rounded-lg text-sm font-bold"
          style={{ background: '#f3f4f6', color: '#6b7280' }}
        >
          ▶
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8" style={{ color: '#9ca3af' }}>読み込み中...</div>
      ) : (
        <div className="space-y-6">
          <Card title="出勤カレンダー">{renderHeatmap()}</Card>

          <Card title="月間集計">
            {!data || data.employees.length === 0 ? <NoData /> : (
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                    <th className="text-left py-3 px-4 font-bold" style={{ color: '#6b7280' }}>氏名</th>
                    <th className="text-center py-3 px-4 font-bold" style={{ color: '#6b7280' }}>出勤日数</th>
                    <th className="text-center py-3 px-4 font-bold" style={{ color: '#6b7280' }}>平均勤務時間</th>
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

export default function AnalyticsPage() {
  const [section, setSection] = useState('work')

  return (
    <div className="h-full overflow-y-auto" style={{ animation: 'fadeIn 0.3s' }}>
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
                : { background: '#f3f4f6', color: '#9ca3af', border: '1.5px solid transparent' }
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
