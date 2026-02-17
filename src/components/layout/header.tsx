'use client'

import { MagnifyingGlassIcon } from '@radix-ui/react-icons'
import { Input } from '@/components/ui/input'

export function Header() {
  return (
    <header className="flex h-16 items-center border-b bg-background px-6">
      <div className="flex flex-1 items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search orders, laundries, drivers..."
            className="pl-10"
          />
        </div>
      </div>
    </header>
  )
}
