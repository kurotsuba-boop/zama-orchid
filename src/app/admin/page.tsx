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
}: {
  title: string
  table: string
  items: MasterItem[]
  reload: () => void
  extraColumns?: { key: string; label: string; render: (item: MasterItem) => React.ReactNode }[]
  extraFields?: (form: any, setForm: (f: any) => void) => React.ReactNode
}) {
  const supabase = createClient()
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<any>({ label: '', display_order: 0 })
  const [saving, setSaving] = useState(false)

  const startEdit = (item: MasterItem) => {
    setEditId(item.id)
    setForm({ ...item })
  }

  const cancelEdit = () => {
    setEditId(null)
    setForm({ label: '', display_order: 0 })
  }

  const save = async () => {
    if (!form.label.trim()) return
    setSaving(true)
    if (editId) {
      const { label, display_order, ...extra } = form
      const updateData: any = { label, display_order }
      // extraフィールドも更新
      if (extra.category !== undefined) updateData.category = extra.category
      if (extra.loss_type !== undefined) updateData.loss_type = extra.loss_type
      await supabase.from(table).update(updateData).eq('id', editId)
    } else {
      const { id, is_active, created_at, ...insertData } = form
      await supabase.from(table).insert(insertData)
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
    setForm({ label: '', display_order: items.length > 0 ? Math.max(...items.map((i) => i.display_order)) + 1 : 1 })
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
      {(editId !== null || form.label !== undefined && editId === null && form.display_order !== 0) ? null : null}
      {editId !== null || (form.label !== '' || form.display_order !== 0) ? (
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
      <div className="rounded-xl overflow-hidden" style={cardStyle}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
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
  const [form, setForm] = useState({ name: '', display_order: 0 })
  const [saving, setSaving] = useState(false)

  const load = async () => {
    const { data } = await supabase.from('employees').select('*').order('display_order')
    if (data) setEmployees(data)
  }

  useEffect(() => { load() }, [])

  const startEdit = (emp: Employee) => {
    setEditId(emp.id)
    setForm({ name: emp.name, display_order: emp.display_order })
  }

  const cancelEdit = () => {
    setEditId(null)
    setForm({ name: '', display_order: 0 })
  }

  const save = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    if (editId) {
      await supabase.from('employees').update({ name: form.name, display_order: form.display_order }).eq('id', editId)
    } else {
      await supabase.from('employees').insert({ name: form.name, display_order: form.display_order })
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
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold" style={{ color: '#1f2937' }}>従業員管理</h3>
        <button onClick={startNew} className="px-4 py-2 rounded-lg text-sm font-bold active:scale-95 transition-all" style={goldBtn}>
          + 新規追加
        </button>
      </div>

      {(editId !== null || form.name !== '') && (
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

      <div className="rounded-xl overflow-hidden" style={cardStyle}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
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
      </div>
    </div>
  )
}
