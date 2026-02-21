'use client'

import { MagnifyingGlassIcon } from '@radix-ui/react-icons'
import { Input } from '@/components/ui/input'
import { ThemeToggle } from '@/components/theme-toggle'
import { MobileMenu } from '@/components/layout/mobile-menu'
import { useAuth } from '@/contexts/auth-context'

/**
 * Sticky header: logo, search, theme toggle, user avatar with online status dot.
 */
export function Header() {
  const { profile } = useAuth()

  return (
    <header
      className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:px-6"
      role="banner"
    >
      <div className="flex flex-1 items-center gap-2 md:gap-4">
        <MobileMenu />
        <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground md:flex">
          <span className="text-sm font-bold">A</span>
        </div>
        <span className="hidden font-semibold text-foreground md:inline-block">
          Admin
        </span>
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlassIcon
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            placeholder="Search orders, laundries, drivers..."
            className="h-10 min-h-[48px] w-full rounded-xl border bg-muted/50 pl-10 focus:bg-background md:min-h-[40px]"
            aria-label="Search orders, laundries, and drivers"
          />
        </div>
        <ThemeToggle />
        <div
          className="relative flex h-10 w-10 min-h-[48px] min-w-[48px] items-center justify-center rounded-full border-2 border-border bg-muted text-sm font-medium text-muted-foreground md:min-h-[40px] md:min-w-[40px]"
          role="img"
          aria-label={profile?.full_name ?? 'Admin user'}
        >
          {profile?.full_name
            ? profile.full_name.slice(0, 2).toUpperCase()
            : profile?.email?.slice(0, 2).toUpperCase() ?? 'A'}
          <span
            className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background bg-primary"
            aria-hidden
            title="Online"
          />
        </div>
      </div>
    </header>
  )
}
