'use client'

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  SortingState,
  ColumnFiltersState,
} from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useState } from 'react'
import { DriverDetailDialog } from './driver-detail-dialog'
import { useAuth } from '@/contexts/auth-context'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { logAdminAudit } from '@/lib/admin-audit'

interface Driver {
  id: string
  user_id: string
  is_active: boolean
  current_latitude: number | null
  current_longitude: number | null
  license_number: string
  vehicle_type: string
  vehicle_registration: string
  rating: number | null
  acceptance_rate: number | null
  on_time_percentage: number | null
  current_load: number
  total_deliveries: number
  profile: {
    full_name: string | null
    email: string
  }
  total_earnings: number
}

interface DriverTableProps {
  onRefresh?: () => void
}

async function fetchDrivers(
  supabase: ReturnType<typeof import('@/lib/supabase/client').createClient>,
  filters: {
    isActive?: boolean
    minRating?: number
    minAcceptanceRate?: number
    maxLoad?: number
  }
): Promise<Driver[]> {
  let query = supabase
    .from('drivers')
    .select(`
      id,
      user_id,
      is_active,
      current_latitude,
      current_longitude,
      license_number,
      vehicle_type,
      vehicle_registration,
      rating,
      acceptance_rate,
      on_time_percentage,
      current_load,
      total_deliveries,
      profiles!drivers_user_id_fkey (
        full_name,
        email
      )
    `)

  if (filters.isActive !== undefined) {
    query = query.eq('is_active', filters.isActive)
  }

  if (filters.minRating !== undefined) {
    query = query.gte('rating', filters.minRating)
  }

  if (filters.minAcceptanceRate !== undefined) {
    query = query.gte('acceptance_rate', filters.minAcceptanceRate)
  }

  if (filters.maxLoad !== undefined) {
    query = query.lte('current_load', filters.maxLoad)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching drivers:', error)
    throw error
  }

  // Fetch earnings for each driver
  const driversWithEarnings = await Promise.all(
    (data || []).map(async (driver) => {
      const { data: payouts } = await supabase
        .from('payouts')
        .select('amount')
        .eq('recipient_type', 'driver')
        .eq('recipient_id', driver.id)
        .eq('status', 'completed')

      const total_earnings =
        payouts?.reduce((sum, p) => sum + Number(p.amount || 0), 0) || 0

      return {
        ...driver,
        profile: Array.isArray(driver.profiles)
          ? driver.profiles[0]
          : driver.profiles,
        total_earnings,
      }
    })
  )

  return driversWithEarnings
}

export function DriverTable({ onRefresh }: DriverTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [filters, setFilters] = useState<{
    isActive?: boolean
    minRating?: number
    minAcceptanceRate?: number
    maxLoad?: number
  }>({})
  const { supabase } = useAuth()

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['drivers', filters],
    queryFn: () => fetchDrivers(supabase, filters),
  })

  const handleToggleActive = async (driverId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('drivers')
        .update({ is_active: !currentStatus })
        .eq('id', driverId)

      if (error) throw error

      // Log to audit
      try {
        await logAdminAudit(supabase, {
          action: currentStatus ? 'suspend_driver' : 'activate_driver',
          targetType: 'driver',
          targetId: driverId,
          details: { is_active: !currentStatus },
        })
      } catch {}

      toast.success(`Driver ${currentStatus ? 'suspended' : 'activated'} successfully`)
      refetch()
      onRefresh?.()
    } catch (error: any) {
      toast.error(error.message || 'Failed to update driver status')
    }
  }

  const columns: ColumnDef<Driver>[] = [
    {
      accessorKey: 'profile.full_name',
      header: 'Name',
      cell: ({ row }) => (
        <div className="font-medium">
          {row.original.profile?.full_name || row.original.profile?.email || 'N/A'}
        </div>
      ),
    },
    {
      accessorKey: 'profile.email',
      header: 'Email',
      cell: ({ row }) => row.original.profile?.email || 'N/A',
    },
    {
      accessorKey: 'vehicle_type',
      header: 'Vehicle',
      cell: ({ row }) => (
        <div className="capitalize">
          {row.getValue('vehicle_type')} ({row.original.vehicle_registration})
        </div>
      ),
    },
    {
      accessorKey: 'is_active',
      header: 'Status',
      cell: ({ row }) => {
        const isActive = row.getValue('is_active') as boolean
        return (
          <Badge variant={isActive ? 'default' : 'secondary'}>
            {isActive ? 'Active' : 'Inactive'}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'rating',
      header: 'Rating',
      cell: ({ row }) => {
        const rating = row.getValue('rating') as number | null
        return rating ? `${rating.toFixed(1)} ⭐` : 'N/A'
      },
    },
    {
      accessorKey: 'acceptance_rate',
      header: 'Acceptance Rate',
      cell: ({ row }) => {
        const rate = row.getValue('acceptance_rate') as number | null
        return rate ? `${rate.toFixed(1)}%` : 'N/A'
      },
    },
    {
      accessorKey: 'on_time_percentage',
      header: 'On-Time %',
      cell: ({ row }) => {
        const percentage = row.getValue('on_time_percentage') as number | null
        return percentage ? `${percentage.toFixed(1)}%` : 'N/A'
      },
    },
    {
      accessorKey: 'current_load',
      header: 'Current Load',
      cell: ({ row }) => row.getValue('current_load') as number,
    },
    {
      accessorKey: 'total_deliveries',
      header: 'Total Deliveries',
      cell: ({ row }) => row.getValue('total_deliveries') as number,
    },
    {
      accessorKey: 'total_earnings',
      header: 'Earnings',
      cell: ({ row }) => {
        const earnings = row.getValue('total_earnings') as number
        return `R${earnings.toFixed(2)}`
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedDriver(row.original)
              setDialogOpen(true)
            }}
          >
            View Details
          </Button>
          <Button
            variant={row.original.is_active ? 'destructive' : 'default'}
            size="sm"
            onClick={() => handleToggleActive(row.original.id, row.original.is_active)}
          >
            {row.original.is_active ? 'Suspend' : 'Activate'}
          </Button>
        </div>
      ),
    },
  ]

  const table = useReactTable({
    data: data || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    state: {
      sorting,
      columnFilters,
    },
  })

  if (isLoading) {
    return <div className="text-center py-8">Loading drivers...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 flex-wrap">
        <Input
          placeholder="Search by name or email..."
          value={(table.getColumn('profile.full_name')?.getFilterValue() as string) ?? ''}
          onChange={(event) =>
            table.getColumn('profile.full_name')?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
        <Select
          value={filters.isActive === undefined ? 'all' : filters.isActive ? 'active' : 'inactive'}
          onValueChange={(value) =>
            setFilters((prev) => ({
              ...prev,
              isActive: value === 'all' ? undefined : value === 'active',
            }))
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={filters.minRating === undefined ? 'all' : filters.minRating.toString()}
          onValueChange={(value) =>
            setFilters((prev) => ({
              ...prev,
              minRating: value === 'all' ? undefined : Number(value),
            }))
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Min Rating" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Ratings</SelectItem>
            <SelectItem value="4.5">4.5+ ⭐</SelectItem>
            <SelectItem value="4.0">4.0+ ⭐</SelectItem>
            <SelectItem value="3.5">3.5+ ⭐</SelectItem>
            <SelectItem value="3.0">3.0+ ⭐</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={filters.minAcceptanceRate === undefined ? 'all' : filters.minAcceptanceRate.toString()}
          onValueChange={(value) =>
            setFilters((prev) => ({
              ...prev,
              minAcceptanceRate: value === 'all' ? undefined : Number(value),
            }))
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Min Acceptance" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Rates</SelectItem>
            <SelectItem value="90">90%+</SelectItem>
            <SelectItem value="80">80%+</SelectItem>
            <SelectItem value="70">70%+</SelectItem>
            <SelectItem value="60">60%+</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={filters.maxLoad === undefined ? 'all' : filters.maxLoad.toString()}
          onValueChange={(value) =>
            setFilters((prev) => ({
              ...prev,
              maxLoad: value === 'all' ? undefined : Number(value),
            }))
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Max Load" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Loads</SelectItem>
            <SelectItem value="0">0 (Available)</SelectItem>
            <SelectItem value="1">1 or less</SelectItem>
            <SelectItem value="2">2 or less</SelectItem>
            <SelectItem value="3">3 or less</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No drivers found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
        </Button>
      </div>

      <DriverDetailDialog
        driver={selectedDriver}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onUpdated={refetch}
      />
    </div>
  )
}
