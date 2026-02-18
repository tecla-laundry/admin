'use client'

import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User, Session } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

interface Profile {
  id: string
  role: 'customer' | 'laundry_owner' | 'admin' | 'driver'
  full_name: string | null
  email: string | null
  phone: string | null
  avatar_url: string | null
}

interface AuthContextType {
  user: User | null
  profile: Profile | null
  loading: boolean
  supabase: ReturnType<typeof createClient>
  signOut: () => Promise<void>
  refreshSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Create a single Supabase client instance for the auth context
// This ensures all auth operations use the same client with shared session state
let authSupabaseClient: ReturnType<typeof createClient> | null = null

function getSupabaseClient() {
  if (!authSupabaseClient) {
    authSupabaseClient = createClient()
  }
  return authSupabaseClient
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [supabase, setSupabase] = useState<ReturnType<typeof createClient> | null>(null)
  const router = useRouter()
  const refreshingRef = useRef(false)

  // Initialize the Supabase client on the client side only
  useEffect(() => {
    try {
      const client = getSupabaseClient()
      setSupabase(client)
    } catch (e) {
      console.error('[AuthContext] Failed to create Supabase client:', e)
      setLoading(false)
    }
  }, [])

  const refreshSession = async (session?: Session | null) => {
    if (!supabase) return
    
    // Prevent concurrent calls
    if (refreshingRef.current) {
      console.log('[AuthContext] refreshSession: Already refreshing, skipping...')
      return
    }

    console.log('\n\n[AuthContext] refreshSession: Starting...', { hasSession: !!session })
    refreshingRef.current = true
    setLoading(true)
    
    try {
      let currentUser: User | null = null
      let userError: any = null

      // If session is provided (from onAuthStateChange), use it directly
      if (session?.user) {
        console.log('[AuthContext] refreshSession: Using session from onAuthStateChange')
        currentUser = session.user
      } else {
        // Otherwise, call getUser() with timeout
        console.log('[AuthContext] refreshSession: Calling supabase.auth.getUser()...')
        
        const getUserPromise = supabase.auth.getUser()
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('getUser() timeout after 5 seconds')), 5000)
        )

        try {
          const result = await Promise.race([getUserPromise, timeoutPromise]) as {
            data: { user: User | null }
            error: any
          }
          
          currentUser = result.data.user
          userError = result.error

          console.log('[AuthContext] refreshSession: getUser() response:', {
            user: currentUser ? { id: currentUser.id, email: currentUser.email } : null,
            error: userError ? { message: userError.message, status: userError.status } : null,
          })
        } catch (timeoutError: any) {
          console.error('[AuthContext] refreshSession: getUser() timeout or error:', timeoutError)
          userError = timeoutError
        }
      }

      if (userError) {
        console.log('[AuthContext] refreshSession: User error detected, clearing state')
        setUser(null)
        setProfile(null)
        setLoading(false)
        refreshingRef.current = false
        return
      }

      console.log('[AuthContext] refreshSession: Setting user state')
      setUser(currentUser)

      if (currentUser) {
        console.log('[AuthContext] refreshSession: Fetching profile for user:', currentUser.id)
        
        // Fetch profile with timeout
        try {
          console.log('[AuthContext] refreshSession: Starting profile fetch...')
          const profilePromise = supabase
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single()
          
          const profileTimeoutPromise = new Promise<{ data: null; error: { message: string } }>((resolve) =>
            setTimeout(() => resolve({ data: null, error: { message: 'Profile fetch timeout after 5 seconds' } }), 5000)
          )

          const profileResult = await Promise.race([profilePromise, profileTimeoutPromise])

          console.log('[AuthContext] refreshSession: Profile fetch completed:', {
            hasData: !!profileResult.data,
            profile: profileResult.data ? { id: profileResult.data.id, role: profileResult.data.role } : null,
            error: profileResult.error ? { message: profileResult.error.message, code: (profileResult.error as any).code } : null,
          })

          if (!profileResult.error && profileResult.data) {
            console.log('[AuthContext] refreshSession: Setting profile state')
            setProfile(profileResult.data as Profile)
          } else {
            console.log('[AuthContext] refreshSession: No profile found or error, clearing profile. Error:', profileResult.error)
            setProfile(null)
          }
        } catch (profileError: any) {
          console.error('[AuthContext] refreshSession: Profile fetch exception:', profileError)
          setProfile(null)
        }
      } else {
        console.log('[AuthContext] refreshSession: No user, clearing profile')
        setProfile(null)
      }
      
      console.log('[AuthContext] refreshSession: Successfully completed')
    } catch (error) {
      console.error('[AuthContext] refreshSession: Error caught:', error)
      setUser(null)
      setProfile(null)
    } finally {
      console.log('[AuthContext] refreshSession: Setting loading to false')
      setLoading(false)
      refreshingRef.current = false
    }
  }

  const signOut = async () => {
    if (!supabase) return
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      setUser(null)
      setProfile(null)
      router.push('/')
      router.refresh()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  useEffect(() => {
    if (!supabase) return
    
    console.log('[AuthContext] useEffect: Initializing auth context')
    
    let hasReceivedInitialSession = false
    
    // First, try to get the current session immediately
    const initializeSession = async () => {
      try {
        console.log('[AuthContext] useEffect: Getting initial session...')
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('[AuthContext] useEffect: Error getting session:', error)
        }
        
        if (session) {
          console.log('[AuthContext] useEffect: Found existing session, refreshing...')
          hasReceivedInitialSession = true
          await refreshSession(session)
        } else {
          console.log('[AuthContext] useEffect: No existing session found')
          setLoading(false)
          refreshingRef.current = false
        }
      } catch (error) {
        console.error('[AuthContext] useEffect: Error in initializeSession:', error)
        setLoading(false)
        refreshingRef.current = false
      }
    }
    
    // Start with getting the current session
    initializeSession()
    
    // Listen for auth changes - this will fire for subsequent changes
    console.log('[AuthContext] useEffect: Setting up auth state change listener')
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[AuthContext] onAuthStateChange: Event received:', {
        event,
        session: session ? { user_id: session.user?.id } : null,
      })
      
      // Skip if we already handled the initial session
      if (event === 'INITIAL_SESSION' && hasReceivedInitialSession) {
        console.log('[AuthContext] onAuthStateChange: Skipping INITIAL_SESSION (already handled)')
        return
      }
      
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        console.log('[AuthContext] onAuthStateChange: Refreshing session for', event)
        // Pass the session directly to avoid calling getUser() again
        await refreshSession(session)
      } else if (event === 'SIGNED_OUT') {
        console.log('[AuthContext] onAuthStateChange: User signed out, clearing state')
        refreshingRef.current = false
        setUser(null)
        setProfile(null)
        setLoading(false)
        router.push('/')
      }
    })

    return () => {
      console.log('[AuthContext] useEffect: Cleanup - unsubscribing from auth changes')
      subscription.unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase])

  // During initial SSR/hydration before useEffect runs, supabase may be null
  // We render children anyway since loading=true will prevent auth-dependent UI
  if (!supabase) {
    return (
      <AuthContext.Provider value={{ user: null, profile: null, loading: true, supabase: null as any, signOut, refreshSession }}>
        {children}
      </AuthContext.Provider>
    )
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, supabase, signOut, refreshSession }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
