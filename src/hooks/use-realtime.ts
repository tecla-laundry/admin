'use client'

import { useEffect, useRef } from 'react'
import { RealtimeChannel } from '@supabase/supabase-js'
import { useAuth } from '@/contexts/auth-context'
import { useQueryClient } from '@tanstack/react-query'

interface UseRealtimeOptions {
  table: string
  filter?: string
  onInsert?: (payload: any) => void
  onUpdate?: (payload: any) => void
  onDelete?: (payload: any) => void
  queryKeys?: (string | any)[][]
}

export function useRealtime({
  table,
  filter,
  onInsert,
  onUpdate,
  onDelete,
  queryKeys = [],
}: UseRealtimeOptions) {
  const { supabase } = useAuth()
  const queryClient = useQueryClient()
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    if (!supabase) return

    const channel = supabase
      .channel(`${table}_changes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          filter,
        },
        (payload) => {
          // Invalidate relevant queries
          queryKeys.forEach((key) => {
            queryClient.invalidateQueries({ queryKey: key })
          })

          // Call custom handlers
          if (payload.eventType === 'INSERT' && onInsert) {
            onInsert(payload)
          } else if (payload.eventType === 'UPDATE' && onUpdate) {
            onUpdate(payload)
          } else if (payload.eventType === 'DELETE' && onDelete) {
            onDelete(payload)
          }
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [supabase, table, filter, onInsert, onUpdate, onDelete, queryKeys, queryClient])
}
