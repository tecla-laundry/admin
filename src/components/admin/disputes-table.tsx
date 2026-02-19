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
  const [refundPercentage, setRefundPercentage] = useState<string>('')
  const [paymentInfo, setPaymentInfo] = useState<{
    amount: number
    refund_amount: number
    status: string
    escrow_status: string
  } | null>(null)
  const [loadingPayment, setLoadingPayment] = useState(false)
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
              onClick={async () => {
                setActionTarget(row.original)
                setActionType(row.original.kind === 'order' ? 'resolve' : 'resolve')
                setActionReason('')
                setRefundAmount('')
                setRefundPercentage('')
                setPaymentInfo(null)

                // Fetch payment info for order disputes
                if (row.original.kind === 'order') {
                  setLoadingPayment(true)
                  try {
                    const { data: payment, error } = await supabase
                      .from('payments')
                      .select('amount, refund_amount, status, escrow_status')
                      .eq('order_id', row.original.orderId)
                      .single()

                    if (!error && payment) {
                      setPaymentInfo({
                        amount: Number(payment.amount || 0),
                        refund_amount: Number(payment.refund_amount || 0),
                        status: payment.status || '',
                        escrow_status: payment.escrow_status || '',
                      })
                    } else {
                      console.warn('[DisputesTable] Could not fetch payment info', error)
                    }
                  } catch (e: any) {
                    console.error('[DisputesTable] Error fetching payment', e)
                  } finally {
                    setLoadingPayment(false)
                  }
                }
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
    console.log('[DisputesTable] runAction: Starting', {
      actionTarget: actionTarget ? { kind: actionTarget.kind, orderId: actionTarget.orderId } : null,
      actionType,
      hasReason: !!actionReason.trim(),
      refundAmount,
    })

    if (!actionTarget) {
      console.warn('[DisputesTable] runAction: No actionTarget, aborting')
      return
    }
    if (!actionReason.trim()) {
      console.warn('[DisputesTable] runAction: No reason provided, showing error')
      toast.error('Please provide a reason/notes')
      return
    }

    setSavingAction(true)
    try {
      const refund = refundAmount ? Number(refundAmount) : 0
      console.log('[DisputesTable] runAction: Parsed refund amount', { refundAmount, refund })

      if (refundAmount && Number.isNaN(refund)) {
        console.error('[DisputesTable] runAction: Invalid refund amount', { refundAmount })
        toast.error('Refund amount must be a number')
        return
      }

      // Validate refund amount against payment
      if (actionType === 'refund' && actionTarget.kind === 'order' && paymentInfo) {
        const maxRefund = paymentInfo.amount - paymentInfo.refund_amount
        if (refund > maxRefund) {
          console.error('[DisputesTable] runAction: Refund exceeds available amount', {
            refund,
            maxRefund,
            paymentAmount: paymentInfo.amount,
            alreadyRefunded: paymentInfo.refund_amount,
          })
          toast.error(`Refund amount cannot exceed R${maxRefund.toFixed(2)} (available for refund)`)
          return
        }
        if (refund <= 0) {
          console.error('[DisputesTable] runAction: Refund amount must be greater than 0', { refund })
          toast.error('Refund amount must be greater than 0')
          return
        }
        console.log('[DisputesTable] runAction: Refund amount validated', {
          refund,
          maxRefund,
          percentage: ((refund / maxRefund) * 100).toFixed(1) + '%',
        })
      }

      if (actionTarget.kind === 'issue') {
        console.log('[DisputesTable] runAction: Processing delivery issue', {
          issueId: actionTarget.issue.id,
          orderId: actionTarget.issue.order_id,
          actionType,
        })

        const { data: auth } = await supabase.auth.getUser()
        const adminId = auth?.user?.id
        console.log('[DisputesTable] runAction: Got admin user', { adminId, hasAuth: !!auth?.user })

        const nextStatus =
          actionType === 'escalate' ? 'investigating' : actionType === 'resolve' ? 'resolved' : 'investigating'
        console.log('[DisputesTable] runAction: Determined next status', { actionType, nextStatus })

        const payload: any = {
          status: nextStatus,
          resolution_notes: actionReason,
        }

        if (nextStatus === 'resolved') {
          payload.resolved_by = adminId ?? null
          payload.resolved_at = new Date().toISOString()
          console.log('[DisputesTable] runAction: Adding resolved fields', {
            resolved_by: payload.resolved_by,
            resolved_at: payload.resolved_at,
          })
        }

        console.log('[DisputesTable] runAction: Updating delivery_issues', {
          issueId: actionTarget.issue.id,
          payload,
        })

        const { error } = await supabase
          .from('delivery_issues')
          .update(payload)
          .eq('id', actionTarget.issue.id)

        if (error) {
          console.error('[DisputesTable] runAction: Error updating delivery_issues', error)
          throw error
        }

        console.log('[DisputesTable] runAction: Successfully updated delivery_issues')

        const auditAction = actionType === 'resolve' ? 'resolve_dispute' : 'escalate_issue'
        console.log('[DisputesTable] runAction: Logging admin audit', { auditAction })

        await logAdminAudit(supabase, {
          action: auditAction,
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

        console.log('[DisputesTable] runAction: Successfully processed issue')
        toast.success('Issue updated')
      } else {
        console.log('[DisputesTable] runAction: Processing order dispute', {
          orderId: actionTarget.orderId,
          actionType,
          refund,
        })

        // Best-effort: call Edge Function `resolve_dispute` if present. Some deployments
        // may not have a dedicated disputes table; in that case we fall back to updating
        // payments/orders directly.
        const notify_parties = true

        const edgeFunctionPayload = {
          dispute_id: actionTarget.orderId,
          resolution: actionReason,
          refund_amount: actionType === 'refund' ? refund : undefined,
          notify_parties,
        }
        console.log('[DisputesTable] runAction: Invoking resolve_dispute Edge Function', {
          payload: edgeFunctionPayload,
        })

        const edge = await invoke('resolve_dispute', {
          body: edgeFunctionPayload,
        })

        console.log('[DisputesTable] runAction: Edge Function response', {
          hasError: !!edge?.error,
          error: edge?.error,
          hasData: !!edge?.data,
        })

        if (edge?.error) {
          console.warn('[DisputesTable] runAction: Edge Function failed, using fallback logic', {
            error: edge.error,
          })

          // Fallback: update payments (refund fields) and resolve order.
          if (actionType === 'refund' && refund > 0) {
            console.log('[DisputesTable] runAction: Processing refund fallback', {
              orderId: actionTarget.orderId,
              refund,
            })

            // Fetch payment amount to decide refunded vs partially_refunded
            console.log('[DisputesTable] runAction: Fetching payment for order', {
              orderId: actionTarget.orderId,
            })

            const { data: payment, error: payErr } = await supabase
              .from('payments')
              .select('id,amount')
              .eq('order_id', actionTarget.orderId)
              .single()

            if (payErr) {
              console.error('[DisputesTable] runAction: Error fetching payment', payErr)
              throw payErr
            }

            console.log('[DisputesTable] runAction: Fetched payment', {
              paymentId: payment?.id,
              amount: payment?.amount,
            })

            const totalAmount = Number(payment?.amount || 0)
            const status = refund >= totalAmount ? 'refunded' : 'partially_refunded'
            console.log('[DisputesTable] runAction: Determined refund status', {
              totalAmount,
              refund,
              status,
            })

            const paymentUpdatePayload = {
              refund_amount: refund,
              refund_reason: actionReason,
              status,
              escrow_status: 'refunded',
            }
            console.log('[DisputesTable] runAction: Updating payment', {
              paymentId: payment.id,
              payload: paymentUpdatePayload,
            })

            const { error: updPayErr } = await supabase
              .from('payments')
              .update(paymentUpdatePayload)
              .eq('id', payment.id)

            if (updPayErr) {
              console.error('[DisputesTable] runAction: Error updating payment', updPayErr)
              throw updPayErr
            }

            console.log('[DisputesTable] runAction: Successfully updated payment')
          }

          // Mark order out of disputed state (best-effort). If refund, cancel; otherwise complete.
          const nextOrderStatus = actionType === 'refund' ? 'cancelled' : 'completed'
          console.log('[DisputesTable] runAction: Updating order status', {
            orderId: actionTarget.orderId,
            nextOrderStatus,
            actionType,
          })

          await supabase.from('orders').update({ status: nextOrderStatus }).eq('id', actionTarget.orderId)

          console.log('[DisputesTable] runAction: Successfully updated order status')
        } else {
          console.log('[DisputesTable] runAction: Edge Function succeeded, skipping fallback')
        }

        const auditAction = actionType === 'refund' ? 'resolve_dispute_refund' : 'resolve_dispute'
        const auditDetails = {
          kind: 'order',
          action: actionType,
          notes: actionReason,
          refund_amount: actionType === 'refund' ? refund : null,
          used_edge_function: !edge?.error,
        }
        console.log('[DisputesTable] runAction: Logging admin audit', {
          auditAction,
          details: auditDetails,
        })

        await logAdminAudit(supabase, {
          action: auditAction,
          targetType: 'dispute',
          targetId: actionTarget.orderId,
          details: auditDetails,
        })

        console.log('[DisputesTable] runAction: Successfully processed dispute')
        toast.success('Dispute action applied')
      }

      console.log('[DisputesTable] runAction: Clearing action target and refreshing')
      setActionTarget(null)
      await refreshAll()
      console.log('[DisputesTable] runAction: Completed successfully')
    } catch (e: any) {
      console.error('[DisputesTable] runAction: Error caught', {
        error: e,
        message: e?.message,
        stack: e?.stack,
      })
      toast.error(e?.message || 'Failed to apply action')
    } finally {
      console.log('[DisputesTable] runAction: Cleaning up (setting savingAction to false)')
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
              All actions are logged for audit purposes. Affected parties will be notified automatically.
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

            {/* Payment Information (for order disputes) */}
            {actionTarget?.kind === 'order' && (
              <div className="rounded-md border p-4 space-y-2 bg-muted/50">
                {loadingPayment ? (
                  <div className="text-sm text-muted-foreground">Loading payment information...</div>
                ) : paymentInfo ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Payment Information</span>
                      <Badge variant={paymentInfo.escrow_status === 'refunded' ? 'destructive' : 'secondary'}>
                        {paymentInfo.escrow_status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Total Amount:</span>
                        <span className="ml-2 font-medium">R{paymentInfo.amount.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Already Refunded:</span>
                        <span className="ml-2 font-medium">
                          R{paymentInfo.refund_amount.toFixed(2)}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Available for Refund:</span>
                        <span className="ml-2 font-medium text-green-600">
                          R{(paymentInfo.amount - paymentInfo.refund_amount).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    Payment information not available
                  </div>
                )}
              </div>
            )}

            {actionType === 'refund' && actionTarget?.kind === 'order' && paymentInfo ? (
              <div className="space-y-3">
                <Label>Refund Amount</Label>
                
                {/* Quick-select refund percentages */}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={refundPercentage === '90' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      const amount = (paymentInfo.amount * 0.9).toFixed(2)
                      setRefundPercentage('90')
                      setRefundAmount(amount)
                    }}
                  >
                    90% (R{((paymentInfo.amount - paymentInfo.refund_amount) * 0.9).toFixed(2)})
                  </Button>
                  <Button
                    type="button"
                    variant={refundPercentage === '50' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      const amount = (paymentInfo.amount * 0.5).toFixed(2)
                      setRefundPercentage('50')
                      setRefundAmount(amount)
                    }}
                  >
                    50% (R{((paymentInfo.amount - paymentInfo.refund_amount) * 0.5).toFixed(2)})
                  </Button>
                  <Button
                    type="button"
                    variant={refundPercentage === '100' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      const amount = (paymentInfo.amount - paymentInfo.refund_amount).toFixed(2)
                      setRefundPercentage('100')
                      setRefundAmount(amount)
                    }}
                  >
                    Full (R{(paymentInfo.amount - paymentInfo.refund_amount).toFixed(2)})
                  </Button>
                </div>

                {/* Custom refund amount input */}
                <div className="space-y-2">
                  <Label htmlFor="refund">Custom Refund Amount (ZAR)</Label>
                  <Input
                    id="refund"
                    type="number"
                    min="0"
                    max={paymentInfo.amount - paymentInfo.refund_amount}
                    step="0.01"
                    value={refundAmount}
                    onChange={(e) => {
                      setRefundAmount(e.target.value)
                      const val = Number(e.target.value)
                      const maxRefund = paymentInfo.amount - paymentInfo.refund_amount
                      if (val > 0 && maxRefund > 0) {
                        const pct = ((val / maxRefund) * 100).toFixed(0)
                        setRefundPercentage(pct === '100' ? '100' : pct === '90' ? '90' : pct === '50' ? '50' : 'custom')
                      } else {
                        setRefundPercentage('')
                      }
                    }}
                    placeholder={`Max: R${(paymentInfo.amount - paymentInfo.refund_amount).toFixed(2)}`}
                  />
                  {refundAmount && (
                    <div className="text-xs text-muted-foreground">
                      {(() => {
                        const refund = Number(refundAmount)
                        const maxRefund = paymentInfo.amount - paymentInfo.refund_amount
                        const pct = maxRefund > 0 ? ((refund / maxRefund) * 100).toFixed(1) : '0'
                        return `Refund: ${pct}% of available amount`
                      })()}
                    </div>
                  )}
                  {refundAmount && Number(refundAmount) > paymentInfo.amount - paymentInfo.refund_amount && (
                    <div className="text-xs text-destructive">
                      Refund amount cannot exceed available refund amount
                    </div>
                  )}
                </div>

                {/* Refund Summary */}
                {refundAmount && Number(refundAmount) > 0 && Number(refundAmount) <= paymentInfo.amount - paymentInfo.refund_amount && (
                  <div className="rounded-md border p-3 bg-blue-50 dark:bg-blue-950 space-y-1">
                    <div className="text-sm font-medium">Refund Summary</div>
                    <div className="text-xs space-y-1">
                      <div className="flex justify-between">
                        <span>Refund Amount:</span>
                        <span className="font-medium">R{Number(refundAmount).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Platform Fee (10%):</span>
                        <span>R{(paymentInfo.amount * 0.1).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Order Status After:</span>
                        <span className="font-medium">Cancelled</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Payment Status After:</span>
                        <span className="font-medium">
                          {Number(refundAmount) >= paymentInfo.amount - paymentInfo.refund_amount
                            ? 'Refunded'
                            : 'Partially Refunded'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : actionType === 'refund' && actionTarget?.kind === 'order' ? (
              <div className="text-sm text-muted-foreground">
                Loading payment information to calculate refund...
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

