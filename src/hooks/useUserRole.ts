'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

export type UserRole = 'admin' | 'user'

export function useUserRole(): { role: UserRole | null; loading: boolean } {
  const [role, setRole] = useState<UserRole | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    let mounted = true

    const fetchRole = async () => {
      const { data } = await supabase.auth.getUser()
      if (!mounted) return
      const metaRole = data.user?.user_metadata?.role
      setRole(metaRole === 'admin' ? 'admin' : 'user')
      setLoading(false)
    }

    fetchRole()

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const metaRole = session?.user?.user_metadata?.role
      setRole(metaRole === 'admin' ? 'admin' : (session?.user ? 'user' : null))
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [])

  return { role, loading }
}
