'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { toast } from 'sonner'

import { useAuth } from '@/contexts/auth-context'
import { logAdminAudit } from '@/lib/admin-audit'
import { useEdgeFunction } from '@/hooks/use-edge-function'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { OrderDetailDrawer } from '@/components/admin/order-detail-drawer'

type DisputedOrder = {
  id: string
  status: string
  total_price: number
  created_at: string
  profiles?: { full_name: string | null; email: string } | { full_name: string | null; email: string }[]
  laundries?: { business_name: string } | { business_name: string }[]
}

type DeliveryIssue = {
  id: string
  order_id: string
  delivery_id: string
  reported_by: string
  reported_by_role: string
  reason: string
  description: string
  photo_urls: string[] | null
  details: any | null
  severity: string
  status: string
  created_at: string
  profiles?: { full_name: string | null; email: string } | { full_name: string | null; email: string }[]
}

type DisputeRow =
  | {
      kind: 'order'
      key: string
      orderId: string
      createdAt: string
      status: string
      severity: string | null
      title: string
      customerLabel: string
      amountZar: number | null
      order: DisputedOrder
      issue: null
    }
  | {
      kind: 'issue'
      key: string
      orderId: string
      createdAt: string
      status: string
      severity: string | null
      title: string
      customerLabel: string
      amountZar: number | null
      order: null
      issue: DeliveryIssue
    }

async function fetchDisputedOrders(
  supabase: ReturnType<typeof import('@/lib/supabase/client').createClient>
): Promise<DisputedOrder[]> {
  const { data, error } = await supabase
    .from('orders')
    .select(
      `
      id,
      status,
      total_price,
      created_at,
      profiles!orders_customer_id_fkey ( full_name, email ),
      laundries!orders_laundry_id_fkey ( business_name )
    `
    )
    .eq('status', 'disputed')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []) as DisputedOrder[]
}

async function fetchOrderForDrawer(
  supabase: ReturnType<typeof import('@/lib/supabase/client').createClient>,
  orderId: string
): Promise<any> {
  const { data: order, error } = await supabase
    .from('orders')
    .select(
      `
      *,
      profiles!orders_customer_id_fkey ( full_name, email ),
      laundries!orders_laundry_id_fkey ( business_name )
    `
    )
    .eq('id', orderId)
    .single()

  if (error) throw error

  const customer = normalizeJoin(order.profiles)
  const laundry = normalizeJoin(order.laundries)

  // Try to find a driver for the order (best-effort, used only for display).
  const { data: delivery } = await supabase
    .from('deliveries')
    .select(
      `
      driver_id,
      drivers!deliveries_driver_id_fkey (
        id,
        user_id,
        profiles!drivers_user_id_fkey ( full_name, email )
      )
    `
    )
    .eq('order_id', orderId)
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
    customer,
    laundry,
    driver,
  }
}

async function fetchOpenDeliveryIssues(
  supabase: ReturnType<typeof import('@/lib/supabase/client').createClient>
): Promise<DeliveryIssue[]> {
  const { data, error } = await supabase
    .from('delivery_issues')
    .select(
      `
      id,
      order_id,
      delivery_id,
      reported_by,
      reported_by_role,
      reason,
      description,
      photo_urls,
      details,
      severity,
      status,
      created_at,
      profiles!delivery_issues_reported_by_fkey ( full_name, email )
    `
    )
    .in('status', ['open', 'investigating'])
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []) as DeliveryIssue[]
}

function normalizeJoin<T>(v: T | T[] | undefined | null): T | null {
  if (!v) return null
  return Array.isArray(v) ? (v[0] ?? null) : v
}

function severityBadgeVariant(sev: string | null) {
  if (!sev) return 'secondary' as const
  if (sev === 'critical') return 'destructive' as const
  if (sev === 'high') return 'default' as const
  return 'secondary' as const
}

export function DisputesTable() {
  const { supabase } = useAuth()
  const { invoke } = useEdgeFunction()

  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])

  const [activeTab, setActiveTab] = useState<'all' | 'orders' | 'issues'>('all')
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [orderDrawerOpen, setOrderDrawerOpen] = useState(false)
  const [loadingOrderDrawer, setLoadingOrderDrawer] = useState(false)

  const [evidenceIssue, setEvidenceIssue] = useState<DeliveryIssue | null>(null)

  const [actionTarget, setActionTarget] = useState<DisputeRow | null>(null)
  const [actionType, setActionType] = useState<'resolve' | 'refund' | 'escalate'>('resolve')
  const [actionReason, setActionReason] = useState('')
  const [refundAmount, setRefundAmount] = useState<string>('')
  const [savingAction, setSavingAction] = useState(false)

  const { data: disputedOrders, isLoading: loadingOrders, refetch: refetchOrders } = useQuery({
    queryKey: ['disputes', 'orders'],
    queryFn: () => fetchDisputedOrders(supabase),
  })

  const { data: openIssues, isLoading: loadingIssues, refetch: refetchIssues } = useQuery({
    queryKey: ['disputes', 'issues'],
    queryFn: () => fetchOpenDeliveryIssues(supabase),
  })

  const rows: DisputeRow[] = useMemo(() => {
    const orders = (disputedOrders || []).map<DisputeRow>((o) => {
      const customer = normalizeJoin(o.profiles)
      const laundry = normalizeJoin(o.laundries)
      return {
        kind: 'order',
        key: `order:${o.id}`,
        orderId: o.id,
        createdAt: o.created_at,
        status: o.status,
        severity: 'high',
        title: laundry?.business_name ? `Order disputed • ${laundry.business_name}` : 'Order disputed',
        customerLabel: customer?.full_name || customer?.email || 'N/A',
        amountZar: typeof o.total_price === 'number' ? o.total_price : null,
        order: o,
        issue: null,
      }
    })

    const issues = (openIssues || []).map<DisputeRow>((i) => {
      const reporter = normalizeJoin(i.profiles)
      return {
        kind: 'issue',
        key: `issue:${i.id}`,
        orderId: i.order_id,
        createdAt: i.created_at,
        status: i.status,
        severity: i.severity || null,
        title: `${i.reason.replace(/_/g, ' ')} • ${i.reported_by_role}`,
        customerLabel: reporter?.full_name || reporter?.email || 'N/A',
        amountZar: null,
        order: null,
        issue: i,
      }
    })

    if (activeTab === 'orders') return orders
    if (activeTab === 'issues') return issues
    return [...orders, ...issues].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
  }, [activeTab, disputedOrders, openIssues])

  const columns = useMemo<ColumnDef<DisputeRow>[]>(() => {
    return [
      {
        accessorKey: 'kind',
        header: 'Type',
        cell: ({ row }) => (
          <Badge variant={row.original.kind === 'order' ? 'default' : 'secondary'}>
            {row.original.kind === 'order' ? 'Order' : 'Issue'}
          </Badge>
        ),
      },
      {
        accessorKey: 'orderId',
        header: 'Order',
        cell: ({ row }) => (
          <div className="font-mono text-xs">{row.original.orderId.slice(0, 8)}…</div>
        ),
      },
      {
        accessorKey: 'title',
        header: 'Summary',
        cell: ({ row }) => <div className="max-w-[360px] truncate">{row.original.title}</div>,
      },
      {
        accessorKey: 'customerLabel',
        header: 'Reported by / Customer',
        cell: ({ row }) => <div className="max-w-[240px] truncate">{row.original.customerLabel}</div>,
      },
      {
        accessorKey: 'severity',
        header: 'Severity',
        cell: ({ row }) => (
          <Badge variant={severityBadgeVariant(row.original.severity)}>
            {(row.original.severity || '—').toString()}
          </Badge>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <Badge variant="secondary">{row.original.status.replace(/_/g, ' ')}</Badge>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: 'Created',
        cell: ({ row }) => {
          const d = new Date(row.original.createdAt)
          return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString()
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
                if (row.original.kind === 'order') {
                  ;(async () => {
                    try {
                      setLoadingOrderDrawer(true)
                      const full = await fetchOrderForDrawer(supabase, row.original.orderId)
                      setSelectedOrder(full)
                      setOrderDrawerOpen(true)
                    } catch (e: any) {
                      toast.error(e?.message || 'Failed to load order')
                    } finally {
                      setLoadingOrderDrawer(false)
                    }
                  })()
                } else {
                  setEvidenceIssue(row.original.issue)
                }
              }}
              disabled={row.original.kind === 'order' && loadingOrderDrawer}
            >
              {row.original.kind === 'order' && loadingOrderDrawer ? 'Loading…' : 'View Evidence'}
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setActionTarget(row.original)
                setActionType(row.original.kind === 'order' ? 'resolve' : 'resolve')
                setActionReason('')
                setRefundAmount('')
              }}
            >
              Take Action
            </Button>
          </div>
        ),
      },
    ]
  }, [])

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    state: { sorting, columnFilters },
  })

  const refreshAll = async () => {
    await Promise.all([refetchOrders(), refetchIssues()])
  }

  const runAction = async () => {
    if (!actionTarget) return
    if (!actionReason.trim()) {
      toast.error('Please provide a reason/notes')
      return
    }

    setSavingAction(true)
    try {
      const refund = refundAmount ? Number(refundAmount) : 0
      if (refundAmount && Number.isNaN(refund)) {
        toast.error('Refund amount must be a number')
        return
      }

      if (actionTarget.kind === 'issue') {
        const { data: auth } = await supabase.auth.getUser()
        const adminId = auth?.user?.id

        const nextStatus =
          actionType === 'escalate' ? 'investigating' : actionType === 'resolve' ? 'resolved' : 'investigating'

        const payload: any = {
          status: nextStatus,
          resolution_notes: actionReason,
        }

        if (nextStatus === 'resolved') {
          payload.resolved_by = adminId ?? null
          payload.resolved_at = new Date().toISOString()
        }

        const { error } = await supabase
          .from('delivery_issues')
          .update(payload)
          .eq('id', actionTarget.issue.id)

        if (error) throw error

        await logAdminAudit(supabase, {
          action: actionType === 'resolve' ? 'resolve_dispute' : 'escalate_issue',
          targetType: 'dispute',
          targetId: actionTarget.issue.id,
          details: {
            kind: 'delivery_issue',
            order_id: actionTarget.issue.order_id,
            delivery_id: actionTarget.issue.delivery_id,
            next_status: nextStatus,
            notes: actionReason,
          },
        })

        toast.success('Issue updated')
      } else {
        // Best-effort: call Edge Function `resolve_dispute` if present. Some deployments
        // may not have a dedicated disputes table; in that case we fall back to updating
        // payments/orders directly.
        const notify_parties = true

        const edge = await invoke('resolve_dispute', {
          body: {
            dispute_id: actionTarget.orderId,
            resolution: actionReason,
            refund_amount: actionType === 'refund' ? refund : undefined,
            notify_parties,
          },
        })

        if (edge?.error) {
          // Fallback: update payments (refund fields) and resolve order.
          if (actionType === 'refund' && refund > 0) {
            // Fetch payment amount to decide refunded vs partially_refunded
            const { data: payment, error: payErr } = await supabase
              .from('payments')
              .select('id,amount')
              .eq('order_id', actionTarget.orderId)
              .single()

            if (payErr) throw payErr

            const totalAmount = Number(payment?.amount || 0)
            const status = refund >= totalAmount ? 'refunded' : 'partially_refunded'

            const { error: updPayErr } = await supabase
              .from('payments')
              .update({
                refund_amount: refund,
                refund_reason: actionReason,
                status,
                escrow_status: 'refunded',
              })
              .eq('id', payment.id)

            if (updPayErr) throw updPayErr
          }

          // Mark order out of disputed state (best-effort). If refund, cancel; otherwise complete.
          const nextOrderStatus = actionType === 'refund' ? 'cancelled' : 'completed'
          await supabase.from('orders').update({ status: nextOrderStatus }).eq('id', actionTarget.orderId)
        }

        await logAdminAudit(supabase, {
          action: actionType === 'refund' ? 'resolve_dispute_refund' : 'resolve_dispute',
          targetType: 'dispute',
          targetId: actionTarget.orderId,
          details: {
            kind: 'order',
            action: actionType,
            notes: actionReason,
            refund_amount: actionType === 'refund' ? refund : null,
            used_edge_function: !edge?.error,
          },
        })

        toast.success('Dispute action applied')
      }

      setActionTarget(null)
      await refreshAll()
    } catch (e: any) {
      toast.error(e?.message || 'Failed to apply action')
    } finally {
      setSavingAction(false)
    }
  }

  const isLoading = loadingOrders || loadingIssues

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Input
          placeholder="Filter by order ID..."
          value={(table.getColumn('orderId')?.getFilterValue() as string) ?? ''}
          onChange={(event) => table.getColumn('orderId')?.setFilterValue(event.target.value)}
          className="max-w-sm"
        />
        <Button variant="outline" onClick={refreshAll}>
          Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="orders">Disputed Orders ({disputedOrders?.length || 0})</TabsTrigger>
          <TabsTrigger value="issues">Open Issues ({openIssues?.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading…</div>
          ) : (
            <>
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
                        <TableRow key={row.id}>
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
                          No disputes/issues found.
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
            </>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!evidenceIssue} onOpenChange={(o) => !o && setEvidenceIssue(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Issue evidence</DialogTitle>
            <DialogDescription>
              Review the issue details and attached photos before taking action.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-sm">
            <div>
              <div className="text-muted-foreground">Reason</div>
              <div className="font-medium">{evidenceIssue?.reason?.replace(/_/g, ' ')}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Description</div>
              <div className="whitespace-pre-wrap">{evidenceIssue?.description}</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-muted-foreground">Severity</div>
                <Badge variant={severityBadgeVariant(evidenceIssue?.severity || null)}>
                  {evidenceIssue?.severity || '—'}
                </Badge>
              </div>
              <div>
                <div className="text-muted-foreground">Status</div>
                <Badge variant="secondary">{evidenceIssue?.status || '—'}</Badge>
              </div>
            </div>
            {evidenceIssue?.photo_urls?.length ? (
              <div>
                <div className="text-muted-foreground mb-1">Photos</div>
                <div className="space-y-2">
                  {evidenceIssue.photo_urls.map((u) => (
                    <a
                      key={u}
                      href={u}
                      target="_blank"
                      rel="noreferrer"
                      className="block truncate text-primary underline"
                    >
                      {u}
                    </a>
                  ))}
                </div>
              </div>
            ) : null}
            {evidenceIssue?.details ? (
              <div>
                <div className="text-muted-foreground mb-1">Details</div>
                <pre className="max-h-48 overflow-auto rounded-md bg-muted p-3 text-xs">
                  {JSON.stringify(evidenceIssue.details, null, 2)}
                </pre>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!actionTarget} onOpenChange={(o) => !o && setActionTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve / refund / escalate</DialogTitle>
            <DialogDescription>
              Actions are logged to <code className="font-mono">admin_audit_logs</code>. If available, notifications are sent via Edge Function.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Action</Label>
              <Select value={actionType} onValueChange={(v) => setActionType(v as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="resolve">Resolve</SelectItem>
                  <SelectItem value="escalate">Escalate</SelectItem>
                  {actionTarget?.kind === 'order' ? <SelectItem value="refund">Refund</SelectItem> : null}
                </SelectContent>
              </Select>
            </div>

            {actionType === 'refund' ? (
              <div className="space-y-2">
                <Label htmlFor="refund">Refund amount (ZAR)</Label>
                <Input
                  id="refund"
                  type="number"
                  min="0"
                  step="0.01"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                />
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="reason">Reason / notes</Label>
              <Input
                id="reason"
                placeholder="Add resolution notes (required)"
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setActionTarget(null)} disabled={savingAction}>
                Cancel
              </Button>
              <Button onClick={runAction} disabled={savingAction}>
                {savingAction ? 'Saving…' : 'Apply'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <OrderDetailDrawer
        order={selectedOrder}
        open={orderDrawerOpen}
        onOpenChange={setOrderDrawerOpen}
        onUpdated={refreshAll}
      />
    </div>
  )
}

