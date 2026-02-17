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
import { useState } from 'react'
import { LaundryDetailDialog } from './laundry-detail-dialog'

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
}

interface LaundryTableProps {
  data: Laundry[]
  onRefresh?: () => void
}

export function LaundryTable({ data, onRefresh }: LaundryTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [selectedLaundry, setSelectedLaundry] = useState<Laundry | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const columns: ColumnDef<Laundry>[] = [
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
    data,
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Input
          placeholder="Filter by business name..."
          value={(table.getColumn('business_name')?.getFilterValue() as string) ?? ''}
          onChange={(event) =>
            table.getColumn('business_name')?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
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
      />
    </div>
  )
}
