import { createBrowserClient } from '@supabase/ssr'

// Singleton pattern - reuse the same client instance
let browserClient: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  // Return existing client if it exists (singleton pattern)
  if (typeof window !== 'undefined' && browserClient) {
    return browserClient
  }
 console.log("SUPABASE URL:", process.env.NEXT_PUBLIC_SUPABASE_URL,
    "SUPABASE ANON KEY:", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  // Create new client - @supabase/ssr handles cookies automatically
  // Don't override cookie handling - let the library do it
  browserClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  return browserClient
}
