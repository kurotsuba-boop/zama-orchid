'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import {
  useWorkMasterAll,
  useLocationMasterAll,
  useVarietyMasterAll,
  useLossReasonMasterAll,
} from '@/hooks/useMaster'
import { useEmployees } from '@/hooks/useEmployees'
import type {
  Employee,
  WorkMaster,
  LocationMaster,
  VarietyMaster,
  LossReasonMaster,
} from '@/lib/types'

// ── CSV ユーティリティ ──
function downloadCsv(filename: string, rows: string[][]) {
  const bom = '\uFEFF'
  const csv = rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function getToday() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getMonthStart() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

function formatTime(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const outlineGoldBtn = {
  background: '#ffffff',
  color: '#b8963e',
  border: '1.5px solid #b8963e',
}

// ── CSV ダウンロードパネル ──
function CsvWorkReport() {
  const supabase = createClient()
  const [from, setFrom] = useState(getMonthStart)
  const [to, setTo] = useState(getToday)
  const [loading, setLoading] = useState(false)

  const download = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('work_reports')
      .select('reported_at, employee_id, work_type, work_category, hours, location, plant_count, plant_count_3f, plant_count_5f, employees(name)')
      .gte('reported_at', `${from}T00:00:00+09:00`)
      .lte('reported_at', `${to}T23:59:59+09:00`)
      .order('reported_at')
    setLoading(false)
    if (!data || data.length === 0) { alert('データがありません'); return }

    const header = ['日付', '時刻', '氏名', '作業内容', 'カテゴリ', '時間', '場所', '株数', '3F', '5F']
    const rows = data.map((r: any) => {
      const dt = new Date(r.reported_at)
      const date = `${dt.getFullYear()}/${String(dt.getMonth() + 1).padStart(2, '0')}/${String(dt.getDate()).padStart(2, '0')}`
      const time = `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`
      return [date, time, r.employees?.name || '', r.work_type, r.work_category, r.hours, r.location || '', r.plant_count ?? '', r.plant_count_3f ?? '', r.plant_count_5f ?? '']
    })
    downloadCsv(`作業報告_${getToday()}.csv`, [header, ...rows])
  }

  return (
    <CsvPanel title="作業報告CSV" from={from} to={to} setFrom={setFrom} setTo={setTo} loading={loading} onDownload={download} />
  )
}

function CsvLossReport() {
  const supabase = createClient()
  const [from, setFrom] = useState(getMonthStart)
  const [to, setTo] = useState(getToday)
  const [loading, setLoading] = useState(false)

  const download = async () => {
    setLoading(true)
    const { data: reports } = await supabase
      .from('loss_reports')
      .select('id, work_date, employee_id, greenhouses, positions, memo, employees(name)')
      .gte('work_date', from)
      .lte('work_date', to)
      .order('work_date')
    if (!reports || reports.length === 0) { setLoading(false); alert('データがありません'); return }

    const ids = reports.map((r) => r.id)
    const { data: items } = await supabase
      .from('loss_report_items')
      .select('loss_report_id, variety, loss_type, reason, quantity')
      .in('loss_report_id', ids)
    setLoading(false)

    const header = ['作業日', '氏名', '温室', '作業区域', '品種', '破棄/B・C品', '理由', '数量', 'メモ']
    const rows: string[][] = []
    reports.forEach((r: any) => {
      const reportItems = (items || []).filter((i) => i.loss_report_id === r.id)
      if (reportItems.length === 0) {
        rows.push([r.work_date, r.employees?.name || '', (r.greenhouses || []).join('/'), (r.positions || []).join('/'), '', '', '', '', r.memo || ''])
      } else {
        reportItems.forEach((i) => {
          rows.push([r.work_date, r.employees?.name || '', (r.greenhouses || []).join('/'), (r.positions || []).join('/'), i.variety, i.loss_type === 'discard' ? '破棄' : 'B・C品', i.reason, String(i.quantity), r.memo || ''])
        })
      }
    })
    downloadCsv(`ロス報告_${getToday()}.csv`, [header, ...rows])
  }

  return (
    <CsvPanel title="ロス報告CSV" from={from} to={to} setFrom={setFrom} setTo={setTo} loading={loading} onDownload={download} />
  )
}

function CsvTimecard() {
  const supabase = createClient()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [loading, setLoading] = useState(false)

  const download = async () => {
    setLoading(true)
    const from = `${year}-${String(month).padStart(2, '0')}-01`
    const lastDay = new Date(year, month, 0).getDate()
    const to = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

    const { data } = await supabase
      .from('timecards')
      .select('work_date, clock_in, clock_out, employees(name)')
      .gte('work_date', from)
      .lte('work_date', to)
      .order('work_date')
    setLoading(false)
    if (!data || data.length === 0) { alert('データがありません'); return }

    const header = ['日付', '氏名', '出勤時刻', '退勤時刻', '勤務時間']
    const rows = data.map((r: any) => {
      let workHours = ''
      if (r.clock_in && r.clock_out) {
        const mins = (new Date(r.clock_out).getTime() - new Date(r.clock_in).getTime()) / 60000
        workHours = (Math.round(mins / 6) / 10).toFixed(1) + 'h'
      }
      return [r.work_date, r.employees?.name || '', formatTime(r.clock_in), formatTime(r.clock_out), workHours]
    })
    downloadCsv(`タイムカード_${year}-${String(month).padStart(2, '0')}.csv`, [header, ...rows])
  }

  return (
    <div>
      <h3 className="text-lg font-bold mb-4" style={{ color: '#1f2937' }}>タイムカードCSV</h3>
      <div className="rounded-xl p-5" style={{ background: '#ffffff', border: '1px solid #e5e7eb' }}>
        <div className="flex items-end gap-3">
          <div>
            <p className="text-xs font-bold mb-1" style={{ color: '#9ca3af' }}>年</p>
            <input type="number" value={year} onChange={(e) => setYear(parseInt(e.target.value) || year)}
              className="w-24 px-3 py-3 rounded-xl text-base text-center focus:outline-none"
              style={{ border: '1.5px solid #e5e7eb', color: '#1f2937' }} />
          </div>
          <div>
            <p className="text-xs font-bold mb-1" style={{ color: '#9ca3af' }}>月</p>
            <input type="number" value={month} min={1} max={12} onChange={(e) => setMonth(parseInt(e.target.value) || month)}
              className="w-20 px-3 py-3 rounded-xl text-base text-center focus:outline-none"
              style={{ border: '1.5px solid #e5e7eb', color: '#1f2937' }} />
          </div>
          <button
            onClick={download}
            disabled={loading}
            className="px-5 py-3 rounded-xl text-sm font-bold active:scale-95 transition-all disabled:opacity-40"
            style={outlineGoldBtn}
          >
            {loading ? '取得中...' : '📥 CSVダウンロード'}
          </button>
        </div>
      </div>
    </div>
  )
}

function CsvPanel({ title, from, to, setFrom, setTo, loading, onDownload }: {
  title: string; from: string; to: string; setFrom: (v: string) => void; setTo: (v: string) => void; loading: boolean; onDownload: () => void
}) {
  return (
    <div>
      <h3 className="text-lg font-bold mb-4" style={{ color: '#1f2937' }}>{title}</h3>
      <div className="rounded-xl p-5" style={{ background: '#ffffff', border: '1px solid #e5e7eb' }}>
        <div className="flex items-end gap-3">
          <div>
            <p className="text-xs font-bold mb-1" style={{ color: '#9ca3af' }}>開始日</p>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
              className="px-3 py-3 rounded-xl text-base focus:outline-none"
              style={{ border: '1.5px solid #e5e7eb', color: '#1f2937' }} />
          </div>
          <div>
            <p className="text-xs font-bold mb-1" style={{ color: '#9ca3af' }}>終了日</p>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
              className="px-3 py-3 rounded-xl text-base focus:outline-none"
              style={{ border: '1.5px solid #e5e7eb', color: '#1f2937' }} />
          </div>
          <button
            onClick={onDownload}
            disabled={loading}
            className="px-5 py-3 rounded-xl text-sm font-bold active:scale-95 transition-all disabled:opacity-40"
            style={outlineGoldBtn}
          >
            {loading ? '取得中...' : '📥 CSVダウンロード'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── 共通スタイル ──
const cardStyle = { background: '#ffffff', border: '1px solid #e5e7eb' }
const goldBtn = { background: '#b8963e', color: '#fff', boxShadow: '0 2px 12px rgba(184,150,62,0.2)' }
const grayBtn = { background: '#f3f4f6', color: '#6b7280' }

// ── Toggle Switch ──
function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className="relative w-12 h-7 rounded-full transition-all"
      style={{ background: value ? '#b8963e' : '#d1d5db' }}
    >
      <span
        className="absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-all"
        style={{ left: value ? '22px' : '2px' }}
      />
    </button>
  )
}

// ── 汎用マスタ管理パネル ──
type MasterItem = {
  id: string
  label: string
  display_order: number
  is_active: boolean
  [key: string]: any
}

function MasterPanel({
  title,
  table,
  items,
  reload,
  extraColumns,
  extraFields,
  extraDefaults,
}: {
  title: string
  table: string
  items: MasterItem[]
  reload: () => void
  extraColumns?: { key: string; label: string; render: (item: MasterItem) => React.ReactNode }[]
  extraFields?: (form: any, setForm: (f: any) => void) => React.ReactNode
  extraDefaults?: Record<string, any>
}) {
  const supabase = createClient()
  const [editId, setEditId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<any>({ label: '', display_order: 0 })
  const [saving, setSaving] = useState(false)

  const startEdit = (item: MasterItem) => {
    setEditId(item.id)
    setForm({ ...item })
    setShowForm(true)
  }

  const cancelEdit = () => {
    setEditId(null)
    setForm({ label: '', display_order: 0 })
    setShowForm(false)
  }

  const save = async () => {
    if (!form.label.trim()) return
    setSaving(true)
    if (editId) {
      const { label, display_order, ...extra } = form
      const updateData: any = { label, display_order }
      if (extra.category !== undefined) updateData.category = extra.category
      if (extra.loss_type !== undefined) updateData.loss_type = extra.loss_type
      const { error } = await supabase.from(table).update(updateData).eq('id', editId)
      if (error) { alert('更新に失敗しました: ' + error.message); setSaving(false); return }
    } else {
      const { id, is_active, created_at, ...insertData } = form
      const { error } = await supabase.from(table).insert(insertData)
      if (error) { alert('追加に失敗しました: ' + error.message); setSaving(false); return }
    }
    setSaving(false)
    cancelEdit()
    reload()
  }

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from(table).update({ is_active: !current }).eq('id', id)
    reload()
  }

  const startNew = () => {
    setEditId(null)
    setForm({
      label: '',
      display_order: items.length > 0 ? Math.max(...items.map((i) => i.display_order)) + 1 : 1,
      ...extraDefaults,
    })
    setShowForm(true)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold" style={{ color: '#1f2937' }}>{title}</h3>
        <button
          onClick={startNew}
          className="px-4 py-2 rounded-lg text-sm font-bold active:scale-95 transition-all"
          style={goldBtn}
        >
          + 新規追加
        </button>
      </div>

      {/* 新規 / 編集フォーム */}
      {showForm ? (
        <div className="rounded-xl p-5 mb-4" style={{ background: '#faf6ed', border: '1px solid #e8dcc3' }}>
          <div className="flex items-end gap-3 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <p className="text-xs font-bold mb-1" style={{ color: '#9ca3af' }}>名称</p>
              <input
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                className="w-full px-4 py-3 rounded-xl text-base focus:outline-none"
                style={{ border: '1.5px solid #e5e7eb', color: '#1f2937' }}
                placeholder="名称を入力"
              />
            </div>
            <div className="w-24">
              <p className="text-xs font-bold mb-1" style={{ color: '#9ca3af' }}>表示順</p>
              <input
                type="number"
                value={form.display_order}
                onChange={(e) => setForm({ ...form, display_order: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-3 rounded-xl text-base text-center focus:outline-none"
                style={{ border: '1.5px solid #e5e7eb', color: '#1f2937' }}
              />
            </div>
            {extraFields && extraFields(form, setForm)}
            <button
              onClick={save}
              disabled={saving || !form.label.trim()}
              className="px-5 py-3 rounded-xl text-sm font-bold text-white active:scale-95 transition-all disabled:opacity-40"
              style={goldBtn}
            >
              {editId ? '更新' : '追加'}
            </button>
            <button
              onClick={cancelEdit}
              className="px-5 py-3 rounded-xl text-sm font-bold active:scale-95 transition-all"
              style={grayBtn}
            >
              キャンセル
            </button>
          </div>
        </div>
      ) : null}

      {/* 一覧テーブル */}
      <div className="rounded-xl overflow-hidden overflow-y-auto" style={{ ...cardStyle, maxHeight: 'calc(100vh - 280px)' }}>
        <table className="w-full text-sm">
          <thead className="sticky top-0" style={{ background: '#f9fafb' }}>
            <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
              <th className="text-left py-3 px-4 font-bold" style={{ color: '#6b7280' }}>名称</th>
              {extraColumns?.map((col) => (
                <th key={col.key} className="text-center py-3 px-4 font-bold" style={{ color: '#6b7280' }}>
                  {col.label}
                </th>
              ))}
              <th className="text-center py-3 px-4 font-bold w-20" style={{ color: '#6b7280' }}>順序</th>
              <th className="text-center py-3 px-4 font-bold w-24" style={{ color: '#6b7280' }}>有効</th>
              <th className="text-center py-3 px-4 font-bold w-20" style={{ color: '#6b7280' }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} style={{ borderBottom: '1px solid #f3f4f6', opacity: item.is_active ? 1 : 0.5 }}>
                <td className="py-3 px-4 font-medium" style={{ color: '#1f2937' }}>{item.label}</td>
                {extraColumns?.map((col) => (
                  <td key={col.key} className="text-center py-3 px-4">{col.render(item)}</td>
                ))}
                <td className="text-center py-3 px-4" style={{ fontFamily: "'DM Mono', monospace", color: '#6b7280' }}>
                  {item.display_order}
                </td>
                <td className="text-center py-3 px-4">
                  <div className="flex justify-center">
                    <Toggle value={item.is_active} onChange={() => toggleActive(item.id, item.is_active)} />
                  </div>
                </td>
                <td className="text-center py-3 px-4">
                  <button
                    onClick={() => startEdit(item)}
                    className="text-sm font-bold px-3 py-1.5 rounded-lg active:scale-95 transition-all"
                    style={{ color: '#b8963e', background: '#faf6ed' }}
                  >
                    編集
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={10} className="text-center py-8" style={{ color: '#9ca3af' }}>データがありません</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── 従業員管理パネル ──
function EmployeePanel() {
  const supabase = createClient()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [editId, setEditId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', display_order: 0 })
  const [saving, setSaving] = useState(false)

  const load = async () => {
    const { data } = await supabase.from('employees').select('*').order('display_order').range(0, 9999)
    if (data) setEmployees(data)
  }

  useEffect(() => { load() }, [])

  const startEdit = (emp: Employee) => {
    setEditId(emp.id)
    setForm({ name: emp.name, display_order: emp.display_order })
    setShowForm(true)
  }

  const cancelEdit = () => {
    setEditId(null)
    setForm({ name: '', display_order: 0 })
    setShowForm(false)
  }

  const save = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    if (editId) {
      const { error } = await supabase.from('employees').update({ name: form.name, display_order: form.display_order }).eq('id', editId)
      if (error) { alert('更新に失敗しました: ' + error.message); setSaving(false); return }
    } else {
      const { error } = await supabase.from('employees').insert({ name: form.name, display_order: form.display_order })
      if (error) { alert('追加に失敗しました: ' + error.message); setSaving(false); return }
    }
    setSaving(false)
    cancelEdit()
    load()
  }

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from('employees').update({ is_active: !current }).eq('id', id)
    load()
  }

  const startNew = () => {
    setEditId(null)
    setForm({ name: '', display_order: employees.length > 0 ? Math.max(...employees.map((e) => e.display_order)) + 1 : 1 })
    setShowForm(true)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold" style={{ color: '#1f2937' }}>従業員管理</h3>
        <button onClick={startNew} className="px-4 py-2 rounded-lg text-sm font-bold active:scale-95 transition-all" style={goldBtn}>
          + 新規追加
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl p-5 mb-4" style={{ background: '#faf6ed', border: '1px solid #e8dcc3' }}>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <p className="text-xs font-bold mb-1" style={{ color: '#9ca3af' }}>氏名</p>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-4 py-3 rounded-xl text-base focus:outline-none"
                style={{ border: '1.5px solid #e5e7eb', color: '#1f2937' }}
                placeholder="氏名を入力"
              />
            </div>
            <div className="w-24">
              <p className="text-xs font-bold mb-1" style={{ color: '#9ca3af' }}>表示順</p>
              <input
                type="number"
                value={form.display_order}
                onChange={(e) => setForm({ ...form, display_order: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-3 rounded-xl text-base text-center focus:outline-none"
                style={{ border: '1.5px solid #e5e7eb', color: '#1f2937' }}
              />
            </div>
            <button
              onClick={save}
              disabled={saving || !form.name.trim()}
              className="px-5 py-3 rounded-xl text-sm font-bold text-white active:scale-95 transition-all disabled:opacity-40"
              style={goldBtn}
            >
              {editId ? '更新' : '追加'}
            </button>
            <button onClick={cancelEdit} className="px-5 py-3 rounded-xl text-sm font-bold active:scale-95 transition-all" style={grayBtn}>
              キャンセル
            </button>
          </div>
        </div>
      )}

      <div className="rounded-xl overflow-hidden overflow-y-auto" style={{ ...cardStyle, maxHeight: 'calc(100vh - 280px)' }}>
        <table className="w-full text-sm">
          <thead className="sticky top-0" style={{ background: '#f9fafb' }}>
            <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
              <th className="text-left py-3 px-4 font-bold" style={{ color: '#6b7280' }}>氏名</th>
              <th className="text-center py-3 px-4 font-bold w-20" style={{ color: '#6b7280' }}>順序</th>
              <th className="text-center py-3 px-4 font-bold w-24" style={{ color: '#6b7280' }}>有効</th>
              <th className="text-center py-3 px-4 font-bold w-20" style={{ color: '#6b7280' }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp) => (
              <tr key={emp.id} style={{ borderBottom: '1px solid #f3f4f6', opacity: emp.is_active ? 1 : 0.5 }}>
                <td className="py-3 px-4 font-medium" style={{ color: '#1f2937' }}>{emp.name}</td>
                <td className="text-center py-3 px-4" style={{ fontFamily: "'DM Mono', monospace", color: '#6b7280' }}>
                  {emp.display_order}
                </td>
                <td className="text-center py-3 px-4">
                  <div className="flex justify-center">
                    <Toggle value={emp.is_active} onChange={() => toggleActive(emp.id, emp.is_active)} />
                  </div>
                </td>
                <td className="text-center py-3 px-4">
                  <button
                    onClick={() => startEdit(emp)}
                    className="text-sm font-bold px-3 py-1.5 rounded-lg active:scale-95 transition-all"
                    style={{ color: '#b8963e', background: '#faf6ed' }}
                  >
                    編集
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── メニュー定義 ──
const MENU = [
  { id: 'employees', label: '従業員管理', icon: '👤' },
  { id: 'work', label: '作業内容マスタ', icon: '🔨' },
  { id: 'location', label: '場所マスタ', icon: '📍' },
  { id: 'variety', label: '品種マスタ', icon: '🌿' },
  { id: 'loss_reason', label: 'ロス理由マスタ', icon: '📋' },
  { id: 'csv_work', label: '作業報告CSV', icon: '📥' },
  { id: 'csv_loss', label: 'ロス報告CSV', icon: '📥' },
  { id: 'csv_timecard', label: 'タイムカードCSV', icon: '📥' },
]

// ── メインページ ──
export default function AdminPage() {
  const router = useRouter()
  const [section, setSection] = useState('employees')

  const workMaster = useWorkMasterAll()
  const locationMaster = useLocationMasterAll()
  const varietyMaster = useVarietyMasterAll()
  const lossReasonMaster = useLossReasonMasterAll()

  const categoryBadge = (cat: string) => (
    <span
      className="px-2 py-0.5 rounded-full text-xs font-bold"
      style={cat === 'A'
        ? { background: '#faf6ed', color: '#b8963e', border: '1px solid #e8dcc3' }
        : { background: '#f3f4f6', color: '#6b7280', border: '1px solid #e5e7eb' }
      }
    >
      {cat === 'A' ? '仕立て' : 'その他'}
    </span>
  )

  const lossTypeBadge = (lt: string) => (
    <span
      className="px-2 py-0.5 rounded-full text-xs font-bold"
      style={lt === 'discard'
        ? { background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }
        : { background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a' }
      }
    >
      {lt === 'discard' ? '破棄' : 'B・C品'}
    </span>
  )

  return (
    <div className="h-full flex gap-6" style={{ animation: 'fadeIn 0.3s' }}>
      {/* 左サイドメニュー */}
      <div className="w-56 flex-shrink-0 flex flex-col gap-1">
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold mb-3 active:scale-95 transition-all"
          style={grayBtn}
        >
          ← 戻る
        </button>
        {MENU.map((m) => (
          <button
            key={m.id}
            onClick={() => setSection(m.id)}
            className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-bold text-left transition-all"
            style={
              section === m.id
                ? { background: '#faf6ed', color: '#b8963e', border: '1.5px solid #e8dcc3' }
                : { color: '#6b7280', border: '1.5px solid transparent' }
            }
          >
            <span>{m.icon}</span>
            <span>{m.label}</span>
          </button>
        ))}
      </div>

      {/* 右コンテンツ */}
      <div className="flex-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 100px)' }}>
        {section === 'employees' && <EmployeePanel />}

        {section === 'work' && (
          <MasterPanel
            title="作業内容マスタ"
            table="work_master"
            items={workMaster.data}
            reload={workMaster.reload}
            extraDefaults={{ category: 'B' }}
            extraColumns={[
              { key: 'category', label: 'カテゴリ', render: (item) => categoryBadge(item.category) },
            ]}
            extraFields={(form, setForm) => (
              <div className="w-32">
                <p className="text-xs font-bold mb-1" style={{ color: '#9ca3af' }}>カテゴリ</p>
                <select
                  value={form.category || 'B'}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full px-3 py-3 rounded-xl text-base focus:outline-none cursor-pointer"
                  style={{ border: '1.5px solid #e5e7eb', color: '#1f2937' }}
                >
                  <option value="A">仕立て (A)</option>
                  <option value="B">その他 (B)</option>
                </select>
              </div>
            )}
          />
        )}

        {section === 'location' && (
          <MasterPanel
            title="場所マスタ"
            table="location_master"
            items={locationMaster.data}
            reload={locationMaster.reload}
          />
        )}

        {section === 'variety' && (
          <MasterPanel
            title="品種マスタ"
            table="variety_master"
            items={varietyMaster.data}
            reload={varietyMaster.reload}
          />
        )}

        {section === 'loss_reason' && (
          <MasterPanel
            title="ロス理由マスタ"
            table="loss_reason_master"
            items={lossReasonMaster.data}
            reload={lossReasonMaster.reload}
            extraDefaults={{ loss_type: 'discard' }}
            extraColumns={[
              { key: 'loss_type', label: '種別', render: (item) => lossTypeBadge(item.loss_type) },
            ]}
            extraFields={(form, setForm) => (
              <div className="w-32">
                <p className="text-xs font-bold mb-1" style={{ color: '#9ca3af' }}>種別</p>
                <select
                  value={form.loss_type || 'discard'}
                  onChange={(e) => setForm({ ...form, loss_type: e.target.value })}
                  className="w-full px-3 py-3 rounded-xl text-base focus:outline-none cursor-pointer"
                  style={{ border: '1.5px solid #e5e7eb', color: '#1f2937' }}
                >
                  <option value="discard">破棄</option>
                  <option value="downgrade">B・C品</option>
                </select>
              </div>
            )}
          />
        )}

        {section === 'csv_work' && <CsvWorkReport />}
        {section === 'csv_loss' && <CsvLossReport />}
        {section === 'csv_timecard' && <CsvTimecard />}
      </div>
    </div>
  )
}
