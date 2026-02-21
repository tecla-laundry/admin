'use client'

import { useState } from 'react'
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
  HamburgerMenuIcon,
  Cross2Icon,
} from '@radix-ui/react-icons'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/auth-context'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

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

export function MobileMenu() {
  const pathname = usePathname()
  const { signOut } = useAuth()
  const [open, setOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    setOpen(false)
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
          <HamburgerMenuIcon className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <SheetHeader className="border-b px-6 py-4">
          <SheetTitle>Admin Dashboard</SheetTitle>
        </SheetHeader>
        <nav className="flex-1 space-y-1 p-4" aria-label="Main navigation">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors min-h-[48px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                <item.icon className="h-5 w-5" aria-hidden="true" />
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
            aria-label="Sign out"
          >
            <ExitIcon className="mr-2 h-4 w-4" aria-hidden="true" />
            Sign Out
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
