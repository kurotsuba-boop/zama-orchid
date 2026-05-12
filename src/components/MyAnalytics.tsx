'use client'

import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { createClient } from '@/lib/supabase'
import { useEmployees } from '@/hooks/useEmployees'
import SelectField from '@/components/SelectField'
import Label from '@/components/Label'

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function formatDate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function getToday() {
  return formatDate(new Date())
}

function getMonday() {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  return formatDate(new Date(d.getFullYear(), d.getMonth(), diff))
}

function getMonthStart() {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`
}

function getMonthLastDay() {
  const d = new Date()
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0)
  return formatDate(last)
}

export default function MyAnalytics() {
  const { employees } = useEmployees()
  const [empId, setEmpId] = useState('')
  const [weekHours, setWeekHours] = useState(0)
  const [byType, setByType] = useState<{ name: string; hours: number }[]>([])
  const [monthDays, setMonthDays] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!empId) {
      setWeekHours(0)
      setByType([])
      setMonthDays(0)
      return
    }

    const load = async () => {
      setLoading(true)
      const supabase = createClient()
      const monday = getMonday()
      const today = getToday()
      const monthStart = getMonthStart()
      const monthEnd = getMonthLastDay()

      // 今週の作業報告 (employee_id 指定)
      const { data: weekReports } = await supabase
        .from('work_reports')
        .select('work_type, hours')
        .eq('employee_id', empId)
        .gte('reported_at', `${monday}T00:00:00+09:00`)
        .lte('reported_at', `${today}T23:59:59+09:00`)

      const total = (weekReports || []).reduce((s, r: any) => s + Number(r.hours || 0), 0)
      setWeekHours(Math.round(total * 10) / 10)

      const typeMap: Record<string, number> = {}
      ;(weekReports || []).forEach((r: any) => {
        typeMap[r.work_type] = (typeMap[r.work_type] || 0) + Number(r.hours || 0)
      })
      setByType(
        Object.entries(typeMap)
          .map(([name, hours]) => ({ name, hours: Math.round(hours * 10) / 10 }))
          .sort((a, b) => b.hours - a.hours)
      )

      // 今月の出勤日数 (clock_in がある日数)
      const { data: timecards } = await supabase
        .from('timecards')
        .select('clock_in')
        .eq('employee_id', empId)
        .gte('work_date', monthStart)
        .lte('work_date', monthEnd)

      const days = (timecards || []).filter((t: any) => t.clock_in).length
      setMonthDays(days)
      setLoading(false)
    }

    load()
  }, [empId])

  const empName = employees.find((e) => e.id === empId)?.name || ''

  return (
    <div className="h-full overflow-y-auto" style={{ animation: 'fadeIn 0.3s' }}>
      <div className="max-w-3xl mx-auto flex flex-col gap-4">
        <div className="max-w-sm">
          <Label>担当氏名</Label>
          <SelectField
            value={empId}
            onChange={setEmpId}
            options={employees.map((e) => ({ id: e.id, name: e.name }))}
            placeholder="名前を選択してください"
          />
        </div>

        {!empId ? (
          <div
            className="flex items-center justify-center rounded-2xl"
            style={{ height: '320px', border: '2px dashed #e5e7eb' }}
          >
            <div className="text-center">
              <p className="text-5xl mb-3">📊</p>
              <p className="text-base" style={{ color: '#9ca3af' }}>
                名前を選択してください
              </p>
            </div>
          </div>
        ) : loading ? (
          <div className="text-center py-12" style={{ color: '#9ca3af' }}>
            読み込み中...
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div
                className="rounded-2xl p-5 text-center"
                style={{ background: '#ffffff', border: '1px solid #e5e7eb' }}
              >
                <p className="text-xs font-bold tracking-[0.15em] uppercase mb-2" style={{ color: '#9ca3af' }}>
                  今週の作業時間
                </p>
                <p
                  className="text-4xl font-bold"
                  style={{ color: '#b8963e', fontFamily: "'DM Mono', monospace" }}
                >
                  {weekHours.toFixed(1)}
                  <span className="text-lg ml-1" style={{ color: '#9ca3af' }}>h</span>
                </p>
                <p className="text-xs mt-1" style={{ color: '#9ca3af' }}>
                  {empName}さん
                </p>
              </div>
              <div
                className="rounded-2xl p-5 text-center"
                style={{ background: '#ffffff', border: '1px solid #e5e7eb' }}
              >
                <p className="text-xs font-bold tracking-[0.15em] uppercase mb-2" style={{ color: '#9ca3af' }}>
                  今月の出勤日数
                </p>
                <p
                  className="text-4xl font-bold"
                  style={{ color: '#b8963e', fontFamily: "'DM Mono', monospace" }}
                >
                  {monthDays}
                  <span className="text-lg ml-1" style={{ color: '#9ca3af' }}>日</span>
                </p>
                <p className="text-xs mt-1" style={{ color: '#9ca3af' }}>
                  {new Date().getFullYear()}年{new Date().getMonth() + 1}月
                </p>
              </div>
            </div>

            <div
              className="rounded-2xl p-5"
              style={{ background: '#ffffff', border: '1px solid #e5e7eb' }}
            >
              <p className="text-sm font-bold mb-3" style={{ color: '#1f2937' }}>
                今週の作業内容別 時間内訳
              </p>
              {byType.length === 0 ? (
                <div className="text-center py-8" style={{ color: '#9ca3af' }}>
                  今週のデータがありません
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(180, byType.length * 36)}>
                  <BarChart data={byType} layout="vertical" margin={{ left: 110, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 11 }} unit="h" />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fill: '#1f2937', fontSize: 11 }}
                      width={105}
                    />
                    <Tooltip
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb' }}
                      formatter={(v: any) => [`${v}h`, '時間']}
                    />
                    <Bar dataKey="hours" fill="#b8963e" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
