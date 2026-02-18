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
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

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
import { LaundryDetailDialog } from './laundry-detail-dialog'
import { useAuth } from '@/contexts/auth-context'
import { useEdgeFunction } from '@/hooks/use-edge-function'

interface Laundry {
  id: string
  business_name: string
  owner_name: string
  email: string
  phone: string
  physical_address: string
  latitude: number
  longitude: number
  status: string
  services_offered: string[]
  price_per_kg: number
  capacity_per_day: number
  operating_hours: Record<string, { open: string; close: string }>
  photos: string[] | null
  rating: number
  total_reviews: number
  is_verified: boolean
  created_at: string
  rejection_reason?: string
  bank_details?: any | null
}

interface LaundryTableProps {
  data: Laundry[]
  onRefresh?: () => void
}

export function LaundryTable({ data, onRefresh }: LaundryTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({})
  const [selectedLaundry, setSelectedLaundry] = useState<Laundry | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [locationFilter, setLocationFilter] = useState('')
  const [minCapacity, setMinCapacity] = useState<string>('')
  const [minRating, setMinRating] = useState<string>('')
  const [serviceFilters, setServiceFilters] = useState<string[]>([])
  const [bulkRejectReason, setBulkRejectReason] = useState('')
  const [bulkLoading, setBulkLoading] = useState(false)
  const { supabase } = useAuth()
  const { invoke } = useEdgeFunction()

  const filteredData = useMemo(() => {
    return data.filter((laundry) => {
      if (
        locationFilter &&
        !laundry.physical_address.toLowerCase().includes(locationFilter.toLowerCase())
      ) {
        return false
      }

      if (minCapacity) {
        const cap = Number(minCapacity)
        if (!Number.isNaN(cap) && laundry.capacity_per_day < cap) return false
      }

      if (minRating) {
        const r = Number(minRating)
        if (!Number.isNaN(r) && laundry.rating < r) return false
      }

      if (serviceFilters.length > 0) {
        const hasAny = serviceFilters.some((s) => laundry.services_offered.includes(s))
        if (!hasAny) return false
      }

      return true
    })
  }, [data, locationFilter, minCapacity, minRating, serviceFilters])

  const toggleServiceFilter = (service: string) => {
    setServiceFilters((prev) =>
      prev.includes(service) ? prev.filter((s) => s !== service) : [...prev, service]
    )
  }

  const columns: ColumnDef<Laundry>[] = [
    {
      id: 'select',
      header: ({ table }) => {
        return (
          <input
            type="checkbox"
            aria-label="Select all"
            checked={table.getIsAllPageRowsSelected()}
            onChange={(event) => table.toggleAllPageRowsSelected(event.target.checked)}
          />
        )
      },
      cell: ({ row }) => (
        <input
          type="checkbox"
          aria-label="Select row"
          checked={row.getIsSelected()}
          onChange={(event) => row.toggleSelected(event.target.checked)}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'business_name',
      header: 'Business Name',
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue('business_name')}</div>
      ),
    },
    {
      accessorKey: 'owner_name',
      header: 'Owner',
    },
    {
      accessorKey: 'email',
      header: 'Email',
    },
    {
      accessorKey: 'phone',
      header: 'Phone',
    },
    {
      accessorKey: 'physical_address',
      header: 'Address',
      cell: ({ row }) => (
        <div className="max-w-[200px] truncate">{row.getValue('physical_address')}</div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('status') as string
        const statusColors: Record<string, string> = {
          pending_approval: 'bg-yellow-100 text-yellow-800',
          active: 'bg-green-100 text-green-800',
          rejected: 'bg-red-100 text-red-800',
          more_info_needed: 'bg-blue-100 text-blue-800',
        }
        return (
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${
              statusColors[status] || 'bg-gray-100 text-gray-800'
            }`}
          >
            {status.replace('_', ' ')}
          </span>
        )
      },
    },
    {
      accessorKey: 'price_per_kg',
      header: 'Price/kg',
      cell: ({ row }) => `R${(row.getValue('price_per_kg') as number).toFixed(2)}`,
    },
    {
      accessorKey: 'capacity_per_day',
      header: 'Capacity',
      cell: ({ row }) => `${row.getValue('capacity_per_day')} kg`,
    },
    {
      accessorKey: 'rating',
      header: 'Rating',
      cell: ({ row }) => {
        const rating = row.getValue('rating') as number
        const reviews = row.original.total_reviews
        return `${rating.toFixed(1)} (${reviews})`
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setSelectedLaundry(row.original)
            setDialogOpen(true)
          }}
        >
          View Details
        </Button>
      ),
    },
  ]

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      rowSelection,
    },
  })

  const selectedRows = table.getSelectedRowModel().rows

  const handleBulkApprove = async () => {
    const pending = selectedRows.filter(
      (row) => row.original.status === 'pending_approval'
    )
    if (!pending.length) {
      toast.error('Select at least one pending application to approve')
      return
    }
    setBulkLoading(true)
    try {
      for (const row of pending) {
        const { error } = await invoke('approve_laundry_partner', {
          body: { laundry_id: row.original.id },
        })
        if (error) throw error
      }
      toast.success(`Approved ${pending.length} laundries`)
      onRefresh?.()
      table.resetRowSelection()
    } catch (error: any) {
      toast.error(error.message || 'Failed to bulk approve laundries')
    } finally {
      setBulkLoading(false)
    }
  }

  const handleBulkReject = async () => {
    const pending = selectedRows.filter(
      (row) => row.original.status === 'pending_approval'
    )
    if (!pending.length) {
      toast.error('Select at least one pending application to reject')
      return
    }
    if (!bulkRejectReason.trim()) {
      toast.error('Provide a rejection reason for bulk reject')
      return
    }
    setBulkLoading(true)
    try {
      for (const row of pending) {
        const { error } = await invoke('reject_laundry_partner', {
          body: { laundry_id: row.original.id, reason: bulkRejectReason },
        })
        if (error) throw error
      }
      toast.success(`Rejected ${pending.length} laundries`)
      setBulkRejectReason('')
      onRefresh?.()
      table.resetRowSelection()
    } catch (error: any) {
      toast.error(error.message || 'Failed to bulk reject laundries')
    } finally {
      setBulkLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Input
            placeholder="Filter by business name..."
            value={(table.getColumn('business_name')?.getFilterValue() as string) ?? ''}
            onChange={(event) =>
              table.getColumn('business_name')?.setFilterValue(event.target.value)
            }
            className="max-w-sm"
          />
          <Input
            placeholder="Location (e.g. Randburg)"
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="max-w-xs"
          />
          <Input
            type="number"
            placeholder="Min capacity (kg)"
            value={minCapacity}
            onChange={(e) => setMinCapacity(e.target.value)}
            className="w-[160px]"
          />
          <Input
            type="number"
            step="0.1"
            placeholder="Min rating"
            value={minRating}
            onChange={(e) => setMinRating(e.target.value)}
            className="w-[140px]"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-muted-foreground">Services:</span>
          {['wash_and_fold', 'dry_clean', 'iron_only', 'express'].map((service) => {
            const active = serviceFilters.includes(service)
            return (
              <button
                key={service}
                type="button"
                onClick={() => toggleServiceFilter(service)}
                className={`rounded-full border px-2 py-1 ${
                  active
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-muted-foreground'
                }`}
              >
                {service.replace('_', ' ')}
              </button>
            )
          })}
        </div>
        {selectedRows.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-2">
            <span className="text-xs text-muted-foreground">
              {selectedRows.length} selected
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                placeholder="Bulk rejection reason"
                value={bulkRejectReason}
                onChange={(e) => setBulkRejectReason(e.target.value)}
                className="w-[220px]"
              />
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkReject}
                disabled={bulkLoading}
              >
                Bulk Reject
              </Button>
              <Button
                size="sm"
                onClick={handleBulkApprove}
                disabled={bulkLoading}
              >
                Bulk Approve
              </Button>
            </div>
          </div>
        )}
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
                  No results.
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

      <LaundryDetailDialog
        laundry={selectedLaundry}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onApproved={onRefresh}
        onRejected={onRefresh}
        onUpdated={onRefresh}
      />
    </div>
  )
}
