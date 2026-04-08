import { createClient } from '@/lib/supabase'

const supabase = createClient()

// ── 作業時間サマリ ──

export async function fetchWorkByType(from: string, to: string) {
  const { data, error } = await supabase.rpc('work_hours_by_type', {
    date_from: from,
    date_to: to,
  })
  if (error) {
    // RPC未作成時のフォールバック: クライアント側で集計
    const { data: raw } = await supabase
      .from('work_reports')
      .select('work_type, hours')
      .gte('reported_at', `${from}T00:00:00+09:00`)
      .lte('reported_at', `${to}T23:59:59+09:00`)
    if (!raw) return []
    const map: Record<string, number> = {}
    raw.forEach((r) => {
      map[r.work_type] = (map[r.work_type] || 0) + Number(r.hours)
    })
    return Object.entries(map)
      .map(([name, hours]) => ({ name, hours: Math.round(hours * 10) / 10 }))
      .sort((a, b) => b.hours - a.hours)
  }
  return data || []
}

export async function fetchWorkByEmployee(from: string, to: string) {
  const { data: raw } = await supabase
    .from('work_reports')
    .select('employee_id, hours, employees(name)')
    .gte('reported_at', `${from}T00:00:00+09:00`)
    .lte('reported_at', `${to}T23:59:59+09:00`)
  if (!raw) return []
  const map: Record<string, { name: string; hours: number }> = {}
  raw.forEach((r: any) => {
    const name = r.employees?.name || '不明'
    if (!map[r.employee_id]) map[r.employee_id] = { name, hours: 0 }
    map[r.employee_id].hours += Number(r.hours)
  })
  return Object.values(map)
    .map((v) => ({ name: v.name, hours: Math.round(v.hours * 10) / 10 }))
    .sort((a, b) => b.hours - a.hours)
}

export async function fetchWorkByDay(from: string, to: string) {
  const { data: raw } = await supabase
    .from('work_reports')
    .select('reported_at, hours')
    .gte('reported_at', `${from}T00:00:00+09:00`)
    .lte('reported_at', `${to}T23:59:59+09:00`)
  if (!raw) return []
  const map: Record<string, number> = {}
  raw.forEach((r) => {
    const day = r.reported_at.split('T')[0]
    map[day] = (map[day] || 0) + Number(r.hours)
  })
  return Object.entries(map)
    .map(([date, hours]) => ({ date, hours: Math.round(hours * 10) / 10 }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

// ── ロス分析 ──

export async function fetchLossByVariety(from: string, to: string) {
  const { data: reports } = await supabase
    .from('loss_reports')
    .select('id')
    .gte('work_date', from)
    .lte('work_date', to)
  if (!reports || reports.length === 0) return []

  const ids = reports.map((r) => r.id)
  const { data: items } = await supabase
    .from('loss_report_items')
    .select('variety, loss_type, quantity')
    .in('loss_report_id', ids)
  if (!items) return []

  const map: Record<string, { variety: string; discard: number; downgrade: number }> = {}
  items.forEach((item) => {
    if (!map[item.variety]) map[item.variety] = { variety: item.variety, discard: 0, downgrade: 0 }
    if (item.loss_type === 'discard') map[item.variety].discard += item.quantity
    else map[item.variety].downgrade += item.quantity
  })
  return Object.values(map)
}

export async function fetchLossByReason(from: string, to: string, lossType: 'discard' | 'downgrade') {
  const { data: reports } = await supabase
    .from('loss_reports')
    .select('id')
    .gte('work_date', from)
    .lte('work_date', to)
  if (!reports || reports.length === 0) return []

  const ids = reports.map((r) => r.id)
  const { data: items } = await supabase
    .from('loss_report_items')
    .select('reason, quantity')
    .in('loss_report_id', ids)
    .eq('loss_type', lossType)
  if (!items) return []

  const map: Record<string, number> = {}
  items.forEach((item) => {
    map[item.reason] = (map[item.reason] || 0) + item.quantity
  })
  return Object.entries(map)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}

export async function fetchLossMonthlyTrend(months: number = 6) {
  const now = new Date()
  const results: { month: string; discard: number; downgrade: number }[] = []

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const from = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
    const to = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    const label = `${d.getMonth() + 1}月`

    const { data: reports } = await supabase
      .from('loss_reports')
      .select('id')
      .gte('work_date', from)
      .lte('work_date', to)

    if (!reports || reports.length === 0) {
      results.push({ month: label, discard: 0, downgrade: 0 })
      continue
    }

    const ids = reports.map((r) => r.id)
    const { data: items } = await supabase
      .from('loss_report_items')
      .select('loss_type, quantity')
      .in('loss_report_id', ids)

    let discard = 0
    let downgrade = 0
    items?.forEach((item) => {
      if (item.loss_type === 'discard') discard += item.quantity
      else downgrade += item.quantity
    })
    results.push({ month: label, discard, downgrade })
  }
  return results
}

// ── 出勤状況 ──

export async function fetchAttendanceMonth(year: number, month: number) {
  const from = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const to = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  const { data } = await supabase
    .from('timecards')
    .select('employee_id, work_date, clock_in, clock_out, employees(name)')
    .gte('work_date', from)
    .lte('work_date', to)
  if (!data) return { records: [], employees: [] }

  const empMap: Record<string, { name: string; days: number; totalMinutes: number; dates: string[] }> = {}

  data.forEach((row: any) => {
    const name = row.employees?.name || '不明'
    if (!empMap[row.employee_id]) {
      empMap[row.employee_id] = { name, days: 0, totalMinutes: 0, dates: [] }
    }
    if (row.clock_in) {
      empMap[row.employee_id].days += 1
      empMap[row.employee_id].dates.push(row.work_date)
      if (row.clock_in && row.clock_out) {
        const mins = (new Date(row.clock_out).getTime() - new Date(row.clock_in).getTime()) / 60000
        empMap[row.employee_id].totalMinutes += mins
      }
    }
  })

  const employees = Object.entries(empMap).map(([id, v]) => ({
    id,
    name: v.name,
    days: v.days,
    avgHours: v.days > 0 ? Math.round((v.totalMinutes / v.days / 60) * 10) / 10 : 0,
    dates: v.dates,
  }))

  return { employees, year, month, lastDay }
}
