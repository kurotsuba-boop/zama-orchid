'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import type { Employee } from '@/lib/types'

export function useEmployees() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('employees')
      .select('*')
      .eq('is_active', true)
      .order('display_order')
      .range(0, 9999)
      .then(({ data }) => {
        if (data) setEmployees(data)
        setLoading(false)
      })
  }, [])

  return { employees, loading }
}
