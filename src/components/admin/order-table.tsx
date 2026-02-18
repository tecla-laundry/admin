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
import { OrderDetailDrawer } from './order-detail-drawer'
import { useAuth } from '@/contexts/auth-context'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Download } from 'lucide-react'
import { format } from 'date-fns'

type OrderStatus =
  | 'pending'
  | 'laundry_requested'
  | 'accepted'
  | 'rejected'
  | 'driver_pickup_assigned'
  | 'pickup_in_progress'
  | 'picked_up'
  | 'at_laundry'
  | 'washing_in_progress'
  | 'ready_for_delivery'
  | 'driver_delivery_assigned'
  | 'delivery_in_progress'
  | 'completed'
  | 'cancelled'
  | 'disputed'

interface Order {
  id: string
  customer_id: string
  laundry_id: string
  status: OrderStatus
  total_price: number
  service_fee: number
  pickup_fee: number
  commission_amount: number
  platform_fee: number
  pickup_address: string
  pickup_latitude: number
  pickup_longitude: number
  dropoff_address: string
  dropoff_latitude: number
  dropoff_longitude: number
  scheduled_pickup_time: string
  estimated_completion_time: string | null
  total_weight_kg: number
  special_notes: string | null
  cancellation_reason: string | null
  cancelled_at: string | null
  cancelled_by: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
  customer: {
    full_name: string | null
    email: string
  }
  laundry: {
    business_name: string
  }
  driver: {
    id: string
    profile: {
      full_name: string | null
      email: string
    }
  } | null
}

interface OrderTableProps {
  onRefresh?: () => void
}

const ORDER_STATUSES: OrderStatus[] = [
  'pending',
  'laundry_requested',
  'accepted',
  'rejected',
  'driver_pickup_assigned',
  'pickup_in_progress',
  'picked_up',
  'at_laundry',
  'washing_in_progress',
  'ready_for_delivery',
  'driver_delivery_assigned',
  'delivery_in_progress',
  'completed',
  'cancelled',
  'disputed',
]

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: 'bg-gray-100 text-gray-800',
  laundry_requested: 'bg-blue-100 text-blue-800',
  accepted: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  driver_pickup_assigned: 'bg-yellow-100 text-yellow-800',
  pickup_in_progress: 'bg-yellow-100 text-yellow-800',
  picked_up: 'bg-purple-100 text-purple-800',
  at_laundry: 'bg-indigo-100 text-indigo-800',
  washing_in_progress: 'bg-indigo-100 text-indigo-800',
  ready_for_delivery: 'bg-cyan-100 text-cyan-800',
  driver_delivery_assigned: 'bg-yellow-100 text-yellow-800',
  delivery_in_progress: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  disputed: 'bg-orange-100 text-orange-800',
}

async function fetchOrders(
  supabase: ReturnType<typeof import('@/lib/supabase/client').createClient>,
  filters: {
    status?: OrderStatus
    dateFrom?: string
    dateTo?: string
    customerId?: string
    laundryId?: string
    driverId?: string
    minAmount?: number
    maxAmount?: number
  }
): Promise<Order[]> {
  let query = supabase
    .from('orders')
    .select(`
      *,
      profiles!orders_customer_id_fkey (
        full_name,
        email
      ),
      laundries!orders_laundry_id_fkey (
        business_name
      )
    `)

  if (filters.status) {
    query = query.eq('status', filters.status)
  }

  if (filters.dateFrom) {
    query = query.gte('created_at', filters.dateFrom)
  }

  if (filters.dateTo) {
    query = query.lte('created_at', filters.dateTo)
  }

  if (filters.customerId) {
    query = query.eq('customer_id', filters.customerId)
  }

  if (filters.laundryId) {
    query = query.eq('laundry_id', filters.laundryId)
  }

  if (filters.minAmount !== undefined) {
    query = query.gte('total_price', filters.minAmount)
  }

  if (filters.maxAmount !== undefined) {
    query = query.lte('total_price', filters.maxAmount)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching orders:', error)
    throw error
  }

  // Fetch driver information for each order
  const ordersWithDrivers = await Promise.all(
    (data || []).map(async (order) => {
      // Find delivery with driver
      const { data: delivery } = await supabase
        .from('deliveries')
        .select(`
          driver_id,
          drivers!deliveries_driver_id_fkey (
            id,
            user_id,
            profiles!drivers_user_id_fkey (
              full_name,
              email
            )
          )
        `)
        .eq('order_id', order.id)
        .not('driver_id', 'is', null)
        .limit(1)
        .single()

      const driver = delivery?.drivers
        ? {
            id: delivery.drivers.id,
            profile: Array.isArray(delivery.drivers.profiles)
              ? delivery.drivers.profiles[0]
              : delivery.drivers.profiles,
          }
        : null

      return {
        ...order,
        customer: Array.isArray(order.profiles)
          ? order.profiles[0]
          : order.profiles,
        laundry: Array.isArray(order.laundries)
          ? order.laundries[0]
          : order.laundries,
        driver,
      }
    })
  )

  return ordersWithDrivers
}

export function OrderTable({ onRefresh }: OrderTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [filters, setFilters] = useState<{
    status?: OrderStatus
    dateFrom?: string
    dateTo?: string
    customerId?: string
    laundryId?: string
    driverId?: string
    minAmount?: number
    maxAmount?: number
  }>({})
  const { supabase } = useAuth()

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['orders', filters],
    queryFn: () => fetchOrders(supabase, filters),
  })

  const handleExportCSV = () => {
    if (!data || data.length === 0) {
      toast.error('No orders to export')
      return
    }

    const headers = [
      'Order ID',
      'Status',
      'Customer',
      'Laundry',
      'Driver',
      'Total Price',
      'Created At',
      'Pickup Address',
      'Dropoff Address',
    ]

    const rows = data.map((order) => [
      order.id,
      order.status,
      order.customer?.full_name || order.customer?.email || 'N/A',
      order.laundry?.business_name || 'N/A',
      order.driver?.profile?.full_name || order.driver?.profile?.email || 'N/A',
      order.total_price.toFixed(2),
      format(new Date(order.created_at), 'yyyy-MM-dd HH:mm:ss'),
      order.pickup_address,
      order.dropoff_address,
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `orders_${format(new Date(), 'yyyy-MM-dd')}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast.success('Orders exported to CSV')
  }

  const columns: ColumnDef<Order>[] = [
    {
      accessorKey: 'id',
      header: 'Order ID',
      cell: ({ row }) => (
        <div className="font-mono text-xs">{row.original.id.slice(0, 8)}...</div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('status') as OrderStatus
        return (
          <Badge className={STATUS_COLORS[status] || 'bg-gray-100 text-gray-800'}>
            {status.replace(/_/g, ' ')}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'customer.full_name',
      header: 'Customer',
      cell: ({ row }) =>
        row.original.customer?.full_name || row.original.customer?.email || 'N/A',
    },
    {
      accessorKey: 'laundry.business_name',
      header: 'Laundry',
      cell: ({ row }) => row.original.laundry?.business_name || 'N/A',
    },
    {
      accessorKey: 'driver.profile.full_name',
      header: 'Driver',
      cell: ({ row }) =>
        row.original.driver?.profile?.full_name ||
        row.original.driver?.profile?.email ||
        'N/A',
    },
    {
      accessorKey: 'total_price',
      header: 'Amount',
      cell: ({ row }) => `R${(row.getValue('total_price') as number).toFixed(2)}`,
    },
    {
      accessorKey: 'created_at',
      header: 'Created',
      cell: ({ row }) => format(new Date(row.getValue('created_at')), 'MMM dd, yyyy'),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setSelectedOrder(row.original)
            setDrawerOpen(true)
          }}
        >
          View Details
        </Button>
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
    return <div className="text-center py-8">Loading orders...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 flex-wrap">
        <Input
          placeholder="Search by order ID..."
          value={(table.getColumn('id')?.getFilterValue() as string) ?? ''}
          onChange={(event) => table.getColumn('id')?.setFilterValue(event.target.value)}
          className="max-w-sm"
        />
        <Select
          value={filters.status || 'all'}
          onValueChange={(value) =>
            setFilters((prev) => ({
              ...prev,
              status: value === 'all' ? undefined : (value as OrderStatus),
            }))
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {ORDER_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {status.replace(/_/g, ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="date"
          placeholder="From Date"
          value={filters.dateFrom || ''}
          onChange={(e) =>
            setFilters((prev) => ({
              ...prev,
              dateFrom: e.target.value || undefined,
            }))
          }
          className="w-[180px]"
        />
        <Input
          type="date"
          placeholder="To Date"
          value={filters.dateTo || ''}
          onChange={(e) =>
            setFilters((prev) => ({
              ...prev,
              dateTo: e.target.value || undefined,
            }))
          }
          className="w-[180px]"
        />
        <Input
          type="number"
          placeholder="Min Amount"
          value={filters.minAmount || ''}
          onChange={(e) =>
            setFilters((prev) => ({
              ...prev,
              minAmount: e.target.value ? Number(e.target.value) : undefined,
            }))
          }
          className="w-[150px]"
        />
        <Input
          type="number"
          placeholder="Max Amount"
          value={filters.maxAmount || ''}
          onChange={(e) =>
            setFilters((prev) => ({
              ...prev,
              maxAmount: e.target.value ? Number(e.target.value) : undefined,
            }))
          }
          className="w-[150px]"
        />
        <Button onClick={handleExportCSV} variant="outline" className="ml-auto">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
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
                  No orders found.
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

      <OrderDetailDrawer
        order={selectedOrder}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onUpdated={refetch}
      />
    </div>
  )
}
