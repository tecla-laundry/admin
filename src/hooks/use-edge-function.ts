'use client'

import { useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { toast } from 'sonner'

/**
 * Hook for invoking Supabase Edge Functions with proper authentication headers.
 * Automatically includes:
 * - Authorization header with anon key (for gateway validation)
 * - x-user-token header with user's access token (for function auth)
 */
export function useEdgeFunction() {
  const { supabase } = useAuth()

  const invoke = useCallback(
    async <T = unknown>(
      functionName: string,
      options: {
        body?: Record<string, unknown>
        headers?: Record<string, string>
      } = {}
    ) => {
      // Get current session to extract user token
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError || !session?.access_token) {
        throw new Error('You must be signed in to invoke Edge Functions.')
      }

      // Prepare headers with required auth headers
      const headers: Record<string, string> = {
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        'x-user-token': session.access_token,
        ...options.headers, // Allow override/additional headers
      }

      // Invoke the function
      const { data, error } = await supabase.functions.invoke<T>(functionName, {
        body: options.body,
        headers,
      })

      if (error) {
        throw error
      }

      return { data, error: null }
    },
    [supabase]
  )

  return { invoke }
}
