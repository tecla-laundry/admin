'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
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

export function Sidebar() {
  const pathname = usePathname()
  const { signOut } = useAuth()

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <div className="flex h-full w-64 flex-col border-r bg-card">
      <div className="flex h-16 items-center border-b px-6">
        <h1 className="text-xl font-bold">Admin Dashboard</h1>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>
      <div className="border-t p-4">
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={handleSignOut}
        >
          <ExitIcon className="mr-2 h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  )
}
