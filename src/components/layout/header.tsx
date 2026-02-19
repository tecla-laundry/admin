'use client'

import { MagnifyingGlassIcon } from '@radix-ui/react-icons'
import { Input } from '@/components/ui/input'
import { ThemeToggle } from '@/components/theme-toggle'
import { MobileMenu } from '@/components/layout/mobile-menu'

export function Header() {
  return (
    <header className="flex h-16 items-center border-b bg-background px-4 md:px-6">
      <div className="flex flex-1 items-center gap-2 md:gap-4">
        <MobileMenu />
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlassIcon 
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" 
            aria-hidden="true"
          />
          <Input
            type="search"
            placeholder="Search orders, laundries, drivers..."
            className="pl-10"
            aria-label="Search orders, laundries, and drivers"
          />
        </div>
        <ThemeToggle />
      </div>
    </header>
  )
}
