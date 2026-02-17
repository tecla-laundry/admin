'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function Home() {
  const { user, profile, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // If user is authenticated and is admin, redirect to admin dashboard
    if (!loading && user && profile?.role === 'admin') {
      router.push('/admin')
    }
  }, [user, profile, loading, router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold">Laundry Marketplace</h1>
          </div>
          <nav className="flex items-center space-x-4">
            {user ? (
              <>
                {profile?.role === 'admin' && (
                  <Button asChild variant="outline">
                    <Link href="/admin">Admin Dashboard</Link>
                  </Button>
                )}
                <Button asChild variant="ghost">
                  <Link href="/sign-in">Sign Out</Link>
                </Button>
              </>
            ) : (
              <Button asChild>
                <Link href="/sign-in">Sign In</Link>
              </Button>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <div className="container mx-auto px-4 py-16">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="mb-4 text-4xl font-bold tracking-tight">
              Welcome to Laundry Marketplace
            </h2>
            <p className="mb-8 text-xl text-muted-foreground">
              Manage your laundry operations with ease
            </p>

            {user ? (
              <Card className="mt-8">
                <CardHeader>
                  <CardTitle>You are signed in</CardTitle>
                  <CardDescription>
                    {profile?.role === 'admin'
                      ? 'Access your admin dashboard to manage the platform.'
                      : 'Welcome back! Access your account features.'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {profile?.role === 'admin' ? (
                    <Button asChild size="lg" className="w-full">
                      <Link href="/admin">Go to Admin Dashboard</Link>
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Your role: <span className="font-medium">{profile?.role}</span>
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="mt-8">
                <CardHeader>
                  <CardTitle>Get Started</CardTitle>
                  <CardDescription>
                    Sign in to access your account and manage your laundry operations.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild size="lg" className="w-full">
                    <Link href="/sign-in">Sign In</Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      <footer className="border-t py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; 2024 Laundry Marketplace. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
