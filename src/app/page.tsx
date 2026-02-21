'use client'

import { useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  BarChart3,
  Shield,
  Truck,
  Building2,
  FileText,
  AlertCircle,
  Wallet,
  Users,
  ArrowRight,
  LayoutDashboard,
} from 'lucide-react'

const HERO_IMAGE = 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=1200&q=80'
const LAUNDRY_IMAGE = 'https://images.unsplash.com/photo-1582735689369-4fe89db7114f?w=800&q=80'
const ORDERS_IMAGE = 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80'
const TEAM_IMAGE = 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&q=80'

export default function Home() {
  const { user, profile, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user && profile?.role === 'admin') {
      router.push('/admin')
    }
  }, [user, profile, loading, router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <span className="text-sm font-bold">L</span>
            </div>
            <span className="text-xl font-bold">Laundry Marketplace</span>
          </div>
          <nav className="flex items-center gap-3">
            {user ? (
              <>
                {profile?.role === 'admin' && (
                  <Button asChild variant="default" className="rounded-xl">
                    <Link href="/admin">
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      Admin Dashboard
                    </Link>
                  </Button>
                )}
                <Button asChild variant="ghost" className="rounded-xl">
                  <Link href="/sign-in">Sign Out</Link>
                </Button>
              </>
            ) : (
              <>
                <Button asChild variant="ghost" className="rounded-xl">
                  <Link href="/sign-in">Sign In</Link>
                </Button>
                <Button asChild className="rounded-xl">
                  <Link href="/sign-in">Admin Sign In</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden border-b">
          <div className="absolute inset-0 z-0">
            <Image
              src={HERO_IMAGE}
              alt=""
              fill
              className="object-cover"
              sizes="100vw"
              priority
            />
            <div className="absolute inset-0 bg-navy-900/70" />
          </div>
          <div className="container relative z-10 mx-auto px-4 py-24 md:py-32">
            <div className="mx-auto max-w-3xl text-center">
              <h1 className="mb-6 text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl">
                Platform Admin
              </h1>
              <p className="mb-8 text-lg text-white/90 md:text-xl">
                Manage orders, partners, drivers, and finances from one powerful dashboard.
                Keep your laundry marketplace running smoothly.
              </p>
              {!user && (
                <Button asChild size="lg" className="rounded-xl text-base">
                  <Link href="/sign-in">
                    Sign in to Admin
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </section>

        {/* What you manage */}
        <section className="border-b py-20">
          <div className="container mx-auto px-4">
            <h2 className="mb-4 text-center text-2xl font-bold tracking-tight md:text-3xl">
              Everything in one place
            </h2>
            <p className="mx-auto mb-12 max-w-2xl text-center text-muted-foreground">
              Oversee the full lifecycle of your marketplace: from partner onboarding to
              order fulfillment and payouts.
            </p>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: Building2, title: 'Laundries', desc: 'Approve and manage partner applications' },
                { icon: Truck, title: 'Drivers', desc: 'Track drivers and delivery assignments' },
                { icon: FileText, title: 'Orders', desc: 'Monitor and resolve order issues' },
                { icon: AlertCircle, title: 'Disputes', desc: 'Handle disputes and delivery issues' },
                { icon: Wallet, title: 'Finance', desc: 'Revenue, payouts, and commission' },
                { icon: BarChart3, title: 'Analytics', desc: 'Insights and platform metrics' },
                { icon: Users, title: 'Admins', desc: 'Manage admin users and invites' },
                { icon: Shield, title: 'Settings', desc: 'Platform configuration and security' },
              ].map((item) => (
                <Card key={item.title} className="rounded-xl border-2 transition-shadow hover:shadow-card-hover">
                  <CardHeader>
                    <item.icon className="mb-2 h-8 w-8 text-primary" />
                    <CardTitle className="text-lg">{item.title}</CardTitle>
                    <CardDescription>{item.desc}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Image + copy blocks */}
        <section className="border-b py-20">
          <div className="container mx-auto px-4">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-muted">
                <Image
                  src={LAUNDRY_IMAGE}
                  alt="Professional laundry facility"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
              <div>
                <h2 className="mb-4 text-2xl font-bold tracking-tight md:text-3xl">
                  Partner management
                </h2>
                <p className="mb-6 text-muted-foreground">
                  Review and approve laundry partner applications, set capacity and service
                  areas, and keep your network of partners active and compliant.
                </p>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    Approve or reject applications with notes
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    View partner profiles and performance
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    Manage status and verification
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b py-20">
          <div className="container mx-auto px-4">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              <div className="order-2 lg:order-1">
                <h2 className="mb-4 text-2xl font-bold tracking-tight md:text-3xl">
                  Orders and operations
                </h2>
                <p className="mb-6 text-muted-foreground">
                  See all orders across the platform, filter by status, and step in when
                  needed. Resolve disputes, handle refunds, and keep customers and partners
                  informed.
                </p>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    Full order history and status timeline
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    Dispute resolution and evidence review
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    Refunds and payment overrides
                  </li>
                </ul>
              </div>
              <div className="relative order-1 aspect-[4/3] overflow-hidden rounded-2xl bg-muted lg:order-2">
                <Image
                  src={ORDERS_IMAGE}
                  alt="Organized laundry and orders"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Trust / team */}
        <section className="border-b py-20">
          <div className="container mx-auto px-4">
            <div className="relative overflow-hidden rounded-2xl bg-muted">
              <div className="absolute inset-0">
                <Image
                  src={TEAM_IMAGE}
                  alt="Team collaboration"
                  fill
                  className="object-cover opacity-40"
                  sizes="100vw"
                />
                <div className="absolute inset-0 bg-navy-900/60" />
              </div>
              <div className="relative z-10 px-6 py-16 text-center md:px-12 md:py-20">
                <h2 className="mb-4 text-2xl font-bold tracking-tight text-white md:text-3xl">
                  Built for platform operators
                </h2>
                <p className="mx-auto max-w-2xl text-lg text-white/90">
                  One dashboard to run your laundry marketplace: partners, drivers, orders,
                  and payments. Secure, auditable, and ready to scale.
                </p>
                {!user && (
                  <Button asChild size="lg" className="mt-8 rounded-xl" variant="secondary">
                    <Link href="/sign-in">Sign in to Admin Dashboard</Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <Card className="overflow-hidden rounded-2xl border-2 border-primary/20">
              <CardHeader className="text-center md:py-12">
                <CardTitle className="text-2xl md:text-3xl">
                  {user
                    ? profile?.role === 'admin'
                      ? 'Go to your dashboard'
                      : 'Welcome back'
                    : 'Ready to manage your platform?'}
                </CardTitle>
                <CardDescription className="text-base">
                  {user && profile?.role === 'admin'
                    ? 'Access orders, partners, finance, and more.'
                    : user
                      ? 'You don’t have admin access. Contact your administrator.'
                      : 'Sign in to access the admin dashboard.'}
                </CardDescription>
                <CardContent className="flex justify-center pt-6">
                  {user && profile?.role === 'admin' ? (
                    <Button asChild size="lg" className="rounded-xl">
                      <Link href="/admin">
                        Open Dashboard
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  ) : !user ? (
                    <Button asChild size="lg" className="rounded-xl">
                      <Link href="/sign-in">Sign In</Link>
                    </Button>
                  ) : null}
                </CardContent>
              </CardHeader>
            </Card>
          </div>
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Laundry Marketplace. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
