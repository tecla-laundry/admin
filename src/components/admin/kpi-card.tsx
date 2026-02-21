'use client'

import { motion } from 'framer-motion'
import CountUp from 'react-countup'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

type KpiCardProps = {
  title: string
  value: string | number
  numericValue?: number
  description: string
  icon: React.ComponentType<{ className?: string }>
  accent?: 'sage' | 'muted' | 'sky'
  loading?: boolean
}

const accentBorder: Record<NonNullable<KpiCardProps['accent']>, string> = {
  sage: 'border-l-4 border-l-primary',
  muted: 'border-l-4 border-l-muted-foreground/30',
  sky: 'border-l-4 border-l-sky-400',
}

export function AdminKpiCard({
  title,
  value,
  numericValue,
  description,
  icon: Icon,
  accent = 'muted',
  loading,
}: KpiCardProps) {
  const isCurrency = typeof value === 'string' && value.startsWith('R')
  const isPercent = typeof value === 'string' && value.includes('%')
  const showCountUp = typeof numericValue === 'number' && !loading

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      <Card glass className={cn('h-full overflow-hidden', accentBorder[accent])}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-8 w-24 mb-2" />
          ) : (
            <div className="text-2xl font-bold tracking-tight">
              {showCountUp ? (
                <>
                  {isCurrency && 'R'}
                  <CountUp
                    end={numericValue!}
                    duration={1.2}
                    decimals={isCurrency ? 2 : 0}
                    separator={isCurrency ? ',' : ''}
                  />
                  {isPercent && '%'}
                </>
              ) : (
                value
              )}
            </div>
          )}
          <p className="text-xs text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    </motion.div>
  )
}
