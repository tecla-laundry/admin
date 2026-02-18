import { createBrowserClient } from '@supabase/ssr'

// Singleton pattern - reuse the same client instance
let browserClient: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  // Return existing client if it exists (singleton pattern)
  if (typeof window !== 'undefined' && browserClient) {
    return browserClient
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    )
  }

  // Create new client - @supabase/ssr handles cookies automatically
  // Don't override cookie handling - let the library do it
  browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey)

  return browserClient
}
