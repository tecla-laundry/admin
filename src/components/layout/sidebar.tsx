'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  DashboardIcon,
  PersonIcon,
  ArrowRightIcon,
  CubeIcon,
  ExclamationTriangleIcon,
  SymbolIcon,
  BarChartIcon,
  PersonIcon as UsersIcon,
  GearIcon,
  ExitIcon,
} from '@radix-ui/react-icons'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/auth-context'
import { toast } from 'sonner'

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: DashboardIcon },
  { name: 'Laundries', href: '/admin/laundries', icon: PersonIcon },
  { name: 'Drivers', href: '/admin/drivers', icon: ArrowRightIcon },
  { name: 'Orders', href: '/admin/orders', icon: CubeIcon },
  { name: 'Disputes', href: '/admin/disputes', icon: ExclamationTriangleIcon },
  { name: 'Finance', href: '/admin/finance', icon: SymbolIcon },
  { name: 'Analytics', href: '/admin/analytics', icon: BarChartIcon },
  { name: 'Admins', href: '/admin/admins', icon: UsersIcon },
  { name: 'Settings', href: '/admin/settings', icon: GearIcon },
]

/**
 * Desktop sidebar with rounded-xl nav; mobile uses bottom nav.
 */
export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { signOut } = useAuth()

  const handleSignOut = async () => {
    try {
      await signOut()
      toast.success('Signed out')
      router.push('/')
      router.refresh()
    } catch {
      toast.error('Failed to sign out')
    }
  }

  return (
    <>
      <aside
        className="hidden h-full w-64 flex-col border-r bg-card md:flex"
        aria-label="Main navigation"
      >
        <div className="flex h-16 items-center border-b px-6">
          <h1 className="text-xl font-bold">Admin Dashboard</h1>
        </div>
        <nav className="flex-1 space-y-1 p-4" role="navigation">
          {navigation.map((item) => {
            const isActive =
              pathname === item.href || pathname?.startsWith(item.href + '/')
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors min-h-[48px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                {item.name}
              </Link>
            )
          })}
        </nav>
        <div className="border-t p-4">
          <Button
            variant="ghost"
            className="w-full justify-start rounded-xl min-h-[48px]"
            onClick={handleSignOut}
            aria-label="Sign out"
          >
            <ExitIcon className="mr-2 h-4 w-4" aria-hidden="true" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t bg-card/95 backdrop-blur md:hidden"
        role="navigation"
        aria-label="Mobile navigation"
      >
        {navigation.slice(0, 5).map((item) => {
          const isActive =
            pathname === item.href || pathname?.startsWith(item.href + '/')
          const Icon = item.icon
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex min-h-[48px] min-w-[48px] flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-2 text-[10px] font-medium transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              <span className="truncate max-w-[52px]">{item.name}</span>
            </Link>
          )
        })}
        <Link
          href="/admin/settings"
          className={cn(
            'flex min-h-[48px] min-w-[48px] flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-2 text-[10px] font-medium transition-colors',
            pathname === '/admin/settings' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
          )}
          aria-current={pathname === '/admin/settings' ? 'page' : undefined}
        >
          <GearIcon className="h-5 w-5" aria-hidden="true" />
          <span>More</span>
        </Link>
      </nav>
    </>
  )
}
