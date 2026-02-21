import { cn } from '@/lib/utils'

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-shimmer rounded-xl', className)}
      aria-busy="true"
      aria-live="polite"
      role="status"
      {...props}
    />
  )
}

export { Skeleton }
