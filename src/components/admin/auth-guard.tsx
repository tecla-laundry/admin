'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'

interface AuthGuardProps {
  children: React.ReactNode
  requiredRole?: 'admin' | 'laundry_owner' | 'driver' | 'customer'
}

export function AuthGuard({ children, requiredRole = 'admin' }: AuthGuardProps) {
  const { user, profile, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    console.log('[AuthGuard] useEffect: Auth state changed:', {
      loading,
      hasUser: !!user,
      hasProfile: !!profile,
      userRole: profile?.role,
      requiredRole,
    })

    // Wait for auth to finish loading
    if (loading) {
      console.log('[AuthGuard] useEffect: Still loading, waiting...')
      return
    }

    // If we have a user but no profile yet, still wait (profile might be loading)
    // This prevents race condition where loading=false but profile hasn't been set yet
    if (user && !profile) {
      console.log('[AuthGuard] useEffect: User exists but profile not loaded yet, waiting...')
      return
    }

    // If no user, redirect to sign-in
    if (!user) {
      console.log('[AuthGuard] useEffect: No user, redirecting to sign-in')
      router.push('/sign-in')
      return
    }

    // If role is required and doesn't match, redirect to 403
    // Only check this if we have a profile (to avoid false negatives during loading)
    if (requiredRole && profile && profile.role !== requiredRole) {
      console.log('[AuthGuard] useEffect: Role mismatch, redirecting to 403:', {
        userRole: profile.role,
        requiredRole,
      })
      router.push('/403')
      return
    }

    console.log('[AuthGuard] useEffect: Auth check passed, rendering children')
  }, [user, profile, loading, requiredRole, router])

  // Show loading state while checking auth or if user exists but profile is not loaded yet
  if (loading || (user && !profile)) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // If no user or wrong role, don't render children (redirect is happening)
  if (!user || (requiredRole && profile && profile.role !== requiredRole)) {
    return null
  }

  // User is authenticated and has correct role, render children
  return <>{children}</>
}
