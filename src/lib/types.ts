export type Employee = {
  id: string
  name: string
  display_order: number
  is_active: boolean
  created_at: string
}

export type WorkReport = {
  id: string
  reported_at: string
  employee_id: string
  work_type: string
  work_category: 'A' | 'B'
  hours: number
  location: string | null
  plant_count: number | null
  created_at: string
  created_by: string | null
}

export type LossReport = {
  id: string
  work_date: string
  employee_id: string
  greenhouses: string[]
  positions: string[]
  seedling_arrival_date: string
  memo: string | null
  created_at: string
  created_by: string | null
}

export type LossReportItem = {
  id: string
  loss_report_id: string
  variety: string
  loss_type: 'discard' | 'downgrade'
  reason: string
  quantity: number
  created_at: string
}

export type Timecard = {
  id: string
  employee_id: string
  work_date: string
  clock_in: string | null
  clock_out: string | null
  created_at: string
}

export type WorkMaster = {
  id: string
  label: string
  category: 'A' | 'B'
  has_floor_count?: boolean
  has_bend_count?: boolean
  has_pole_count?: boolean
  display_order: number
  is_active: boolean
  created_at: string
}

export type LocationMaster = {
  id: string
  label: string
  display_order: number
  is_active: boolean
  created_at: string
}

export type VarietyMaster = {
  id: string
  label: string
  display_order: number
  is_active: boolean
  created_at: string
}

export type LossReasonMaster = {
  id: string
  label: string
  loss_type: 'discard' | 'downgrade'
  display_order: number
  is_active: boolean
  created_at: string
}
