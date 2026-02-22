'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'

import { useAuth } from '@/contexts/auth-context'
import { logAdminAudit } from '@/lib/admin-audit'
import { useEdgeFunction } from '@/hooks/use-edge-function'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

type PlatformSettingRow = { key: string; value: any; updated_at?: string | null }

async function getPlatformSetting(
  supabase: ReturnType<typeof import('@/lib/supabase/client').createClient>,
  key: string
): Promise<PlatformSettingRow | null> {
  const { data, error } = await supabase
    .from('platform_settings')
    .select('key,value,updated_at')
    .eq('key', key)
    .single()

  if (error) return null
  return data as PlatformSettingRow
}

async function upsertPlatformSetting(
  supabase: ReturnType<typeof import('@/lib/supabase/client').createClient>,
  key: string,
  value: any
) {
  const { error } = await supabase
    .from('platform_settings')
    .upsert({ key, value }, { onConflict: 'key' })
  if (error) throw error
}

async function fetchUnpaidEarningsSummary(
  supabase: ReturnType<typeof import('@/lib/supabase/client').createClient>
): Promise<{ pendingLaundry: number; pendingDrivers: number; pendingPlatform: number; totalUnpaid: number }> {
  const { data, error } = await supabase
    .from('earnings')
    .select('recipient_type,amount')
    .eq('paid', false)
  if (error) throw error
  let pendingLaundry = 0
  let pendingDrivers = 0
  let pendingPlatform = 0
  for (const row of data || []) {
    const amt = Number((row as any).amount || 0)
    const type = (row as any).recipient_type
    if (type === 'laundry') pendingLaundry += amt
    if (type === 'driver') pendingDrivers += amt
    if (type === 'platform') pendingPlatform += amt
  }
  const totalUnpaid = pendingLaundry + pendingDrivers + pendingPlatform
  return { pendingLaundry, pendingDrivers, pendingPlatform, totalUnpaid }
}

async function fetchPayoutsAndEscrow(
  supabase: ReturnType<typeof import('@/lib/supabase/client').createClient>
) {
  const [{ data: payouts, error: payoutsErr }, { data: escrow, error: escrowErr }] = await Promise.all([
    supabase.from('payouts').select('recipient_type,amount,status').eq('status', 'pending'),
    supabase.from('payments').select('amount,escrow_status,status').eq('escrow_status', 'held'),
  ])
  if (payoutsErr) throw payoutsErr
  if (escrowErr) throw escrowErr

  let pendingLaundry = 0
  let pendingDrivers = 0
  let pendingPlatform = 0
  for (const p of payouts || []) {
    const amt = Number((p as any).amount || 0)
    if ((p as any).recipient_type === 'laundry') pendingLaundry += amt
    if ((p as any).recipient_type === 'driver') pendingDrivers += amt
    if ((p as any).recipient_type === 'platform') pendingPlatform += amt
  }

  let escrowHeld = 0
  for (const pay of escrow || []) {
    const amt = Number((pay as any).amount || 0)
    if ((pay as any).status !== 'failed') escrowHeld += amt
  }

  return { pendingLaundry, pendingDrivers, pendingPlatform, escrowHeld }
}

type EarningRow = {
  id: string
  order_id: string
  recipient_type: string
  recipient_id: string | null
  amount: number
  paid: boolean
  paid_at: string | null
  created_at: string
  description: string | null
}

async function fetchEarnings(
  supabase: ReturnType<typeof import('@/lib/supabase/client').createClient>,
  opts: { dateFrom?: string; dateTo?: string; recipientType?: string; paid?: boolean }
) {
  let q = supabase
    .from('earnings')
    .select('id,order_id,recipient_type,recipient_id,amount,paid,paid_at,created_at,description')
    .order('created_at', { ascending: false })
    .limit(500)
  if (opts.dateFrom) q = q.gte('created_at', new Date(`${opts.dateFrom}T00:00:00.000Z`).toISOString())
  if (opts.dateTo) q = q.lte('created_at', new Date(`${opts.dateTo}T23:59:59.999Z`).toISOString())
  if (opts.recipientType) q = q.eq('recipient_type', opts.recipientType)
  if (opts.paid !== undefined) q = q.eq('paid', opts.paid)
  const { data, error } = await q
  if (error) throw error
  return (data || []) as EarningRow[]
}

async function fetchPayoutsList(
  supabase: ReturnType<typeof import('@/lib/supabase/client').createClient>
) {
  const { data, error } = await supabase
    .from('payouts')
    .select('id,recipient_type,recipient_id,amount,status,period_start,period_end,processed_at,created_at')
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw error
  return (data || []) as any[]
}

async function fetchPayments(
  supabase: ReturnType<typeof import('@/lib/supabase/client').createClient>,
  dateFrom?: string,
  dateTo?: string
) {
  let q = supabase
    .from('payments')
    .select(
      'id,order_id,customer_id,amount,currency,status,escrow_status,commission_amount,platform_fee,laundry_payout_amount,driver_payout_amount,refund_amount,payment_method,payment_provider_transaction_id,webhook_processed_at,webhook_payload,created_at,paid_at'
    )
    .order('created_at', { ascending: false })
    .limit(200)

  if (dateFrom) q = q.gte('created_at', dateFrom)
  if (dateTo) q = q.lte('created_at', dateTo)

  const { data, error } = await q
  if (error) throw error
  return (data || []) as any[]
}

function startOfDayIso(d: string) {
  return d ? new Date(`${d}T00:00:00.000Z`).toISOString() : undefined
}
function endOfDayIso(d: string) {
  return d ? new Date(`${d}T23:59:59.999Z`).toISOString() : undefined
}

export function FinanceDashboard() {
  const { supabase } = useAuth()
  const { invoke } = useEdgeFunction()

  // Commission settings
  const [commissionRate, setCommissionRate] = useState('0.15')
  const [platformFee, setPlatformFee] = useState('15')
  const [savingCommission, setSavingCommission] = useState(false)

  const { data: unpaidSummary, isLoading: loadingUnpaidSummary, refetch: refetchUnpaidSummary } = useQuery({
    queryKey: ['finance', 'unpaid-earnings-summary'],
    queryFn: () => fetchUnpaidEarningsSummary(supabase),
  })

  // Payout controls
  const [periodStart, setPeriodStart] = useState<string>('')
  const [periodEnd, setPeriodEnd] = useState<string>('')
  const [processingPayouts, setProcessingPayouts] = useState(false)
  const [markingPaidId, setMarkingPaidId] = useState<string | null>(null)
  const { data: payoutSummary, isLoading: loadingPayoutSummary, refetch: refetchPayoutSummary } = useQuery({
    queryKey: ['finance', 'payout-summary'],
    queryFn: () => fetchPayoutsAndEscrow(supabase),
  })
  const { data: payoutsList, isLoading: loadingPayoutsList, refetch: refetchPayoutsList } = useQuery({
    queryKey: ['finance', 'payouts-list'],
    queryFn: () => fetchPayoutsList(supabase),
  })

  // Earnings (from earnings table)
  const [earningsFrom, setEarningsFrom] = useState<string>('')
  const [earningsTo, setEarningsTo] = useState<string>('')
  const [earningsRecipientType, setEarningsRecipientType] = useState<string>('')
  const [earningsPaidFilter, setEarningsPaidFilter] = useState<'all' | 'paid' | 'unpaid'>('all')
  const { data: earnings, isLoading: loadingEarnings, refetch: refetchEarnings } = useQuery({
    queryKey: ['finance', 'earnings', earningsFrom, earningsTo, earningsRecipientType, earningsPaidFilter],
    queryFn: () =>
      fetchEarnings(supabase, {
        dateFrom: earningsFrom || undefined,
        dateTo: earningsTo || undefined,
        recipientType: earningsRecipientType || undefined,
        paid: earningsPaidFilter === 'all' ? undefined : earningsPaidFilter === 'paid',
      }),
  })

  const earningsTotals = useMemo(() => {
    const t = { platform: 0, laundry: 0, driver: 0 }
    for (const e of earnings || []) {
      const amt = Number(e.amount || 0)
      if (e.recipient_type === 'platform') t.platform += amt
      if (e.recipient_type === 'laundry') t.laundry += amt
      if (e.recipient_type === 'driver') t.driver += amt
    }
    return t
  }, [earnings])

  // Payments (customer payments)
  const [paymentsFrom, setPaymentsFrom] = useState<string>('')
  const [paymentsTo, setPaymentsTo] = useState<string>('')
  const { data: payments, isLoading: loadingPayments, refetch: refetchPayments } = useQuery({
    queryKey: ['finance', 'payments', paymentsFrom, paymentsTo],
    queryFn: () => fetchPayments(supabase, startOfDayIso(paymentsFrom), endOfDayIso(paymentsTo)),
  })

  const totals = useMemo(() => {
    const t = {
      amount: 0,
      commission: 0,
      platformFee: 0,
      laundryPayout: 0,
      driverPayout: 0,
      refund: 0,
    }
    for (const p of payments || []) {
      t.amount += Number(p.amount || 0)
      t.commission += Number(p.commission_amount || 0)
      t.platformFee += Number(p.platform_fee || 0)
      t.laundryPayout += Number(p.laundry_payout_amount || 0)
      t.driverPayout += Number(p.driver_payout_amount || 0)
      t.refund += Number(p.refund_amount || 0)
    }
    return t
  }, [payments])

  // Load stored settings (best-effort)
  useQuery({
    queryKey: ['finance', 'platform-settings'],
    queryFn: async () => {
      const [rate, fee] = await Promise.all([
        getPlatformSetting(supabase, 'commission_rate_default'),
        getPlatformSetting(supabase, 'platform_fee_default'),
      ])
      if (rate?.value != null) setCommissionRate(String(rate.value))
      if (fee?.value != null) setPlatformFee(String(fee.value))
      return { rate, fee }
    },
  })

  const saveCommissionSettings = async () => {
    const r = Number(commissionRate)
    const f = Number(platformFee)
    if (Number.isNaN(r) || r < 0 || r > 1) {
      toast.error('Commission rate must be between 0 and 1 (e.g. 0.15)')
      return
    }
    if (Number.isNaN(f) || f < 0) {
      toast.error('Platform fee must be a positive number (e.g. 15)')
      return
    }

    setSavingCommission(true)
    try {
      await upsertPlatformSetting(supabase, 'commission_rate_default', r)
      await upsertPlatformSetting(supabase, 'platform_fee_default', f)

      await logAdminAudit(supabase, {
        action: 'update_settings',
        targetType: 'settings',
        targetId: null,
        details: { commission_rate_default: r, platform_fee_default: f },
      })

      toast.success('Commission settings saved')
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save commission settings')
    } finally {
      setSavingCommission(false)
    }
  }

  const processWeeklyPayouts = async () => {
    if (!periodStart || !periodEnd) {
      toast.error('Select period start and end dates')
      return
    }
    setProcessingPayouts(true)
    try {
      const { data, error } = await invoke('process_payouts', {
        body: { period_start: periodStart, period_end: periodEnd },
      })
      if (error) throw error

      await logAdminAudit(supabase, {
        action: 'process_payout',
        targetType: 'payout',
        targetId: null,
        details: { period_start: periodStart, period_end: periodEnd, result: data ?? null },
      })

      toast.success('Payouts processed from earnings')
      refetchPayoutSummary()
      refetchPayoutsList()
      refetchEarnings()
      refetchUnpaidSummary()
    } catch (e: any) {
      toast.error(e?.message || 'Failed to process payouts')
    } finally {
      setProcessingPayouts(false)
    }
  }

  const markPayoutPaid = async (payoutId: string) => {
    setMarkingPaidId(payoutId)
    try {
      const { error } = await invoke('mark_payout_paid', { body: { payout_id: payoutId } })
      if (error) throw error
      toast.success('Payout marked as paid')
      refetchPayoutSummary()
      refetchPayoutsList()
      refetchEarnings()
      refetchUnpaidSummary()
    } catch (e: any) {
      toast.error(e?.message || 'Failed to mark payout as paid')
    } finally {
      setMarkingPaidId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Commission Management</CardTitle>
            <CardDescription>Set the default commission rate for all partners, with the option to customize rates for individual partners</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="commission">Default commission rate</Label>
                <Input
                  id="commission"
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Use decimals (0.15 = 15%).</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="platformFee">Default platform fee (ZAR)</Label>
                <Input
                  id="platformFee"
                  type="number"
                  step="1"
                  min="0"
                  value={platformFee}
                  onChange={(e) => setPlatformFee(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={saveCommissionSettings} disabled={savingCommission}>
                {savingCommission ? 'Saving…' : 'Save settings'}
              </Button>
            </div>

            <div className="pt-2 border-t">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Pending earnings (unpaid)</div>
                <Button variant="outline" size="sm" onClick={() => refetchUnpaidSummary()} disabled={loadingUnpaidSummary}>
                  {loadingUnpaidSummary ? 'Loading…' : 'Refresh'}
                </Button>
              </div>
              {loadingUnpaidSummary ? (
                <p className="text-sm text-muted-foreground mt-2">Loading…</p>
              ) : (
                <div className="mt-3 grid gap-3 sm:grid-cols-4">
                  <div className="rounded-md border p-3">
                    <div className="text-xs text-muted-foreground">Pending laundries</div>
                    <div className="text-lg font-semibold">R{(unpaidSummary?.pendingLaundry ?? 0).toFixed(2)}</div>
                  </div>
                  <div className="rounded-md border p-3">
                    <div className="text-xs text-muted-foreground">Pending drivers</div>
                    <div className="text-lg font-semibold">R{(unpaidSummary?.pendingDrivers ?? 0).toFixed(2)}</div>
                  </div>
                  <div className="rounded-md border p-3">
                    <div className="text-xs text-muted-foreground">Pending platform</div>
                    <div className="text-lg font-semibold">R{(unpaidSummary?.pendingPlatform ?? 0).toFixed(2)}</div>
                  </div>
                  <div className="rounded-md border p-3">
                    <div className="text-xs text-muted-foreground">Money held (escrow)</div>
                    <div className="text-lg font-semibold">R{(unpaidSummary?.totalUnpaid ?? 0).toFixed(2)}</div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payout Overview</CardTitle>
            <CardDescription>View pending payments for partners and drivers, plus funds held in the system</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingPayoutSummary ? (
              <div className="text-sm text-muted-foreground">Loading…</div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-4">
                <div className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground">Pending laundries</div>
                  <div className="text-lg font-semibold">R{(payoutSummary?.pendingLaundry || 0).toFixed(2)}</div>
                </div>
                <div className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground">Pending drivers</div>
                  <div className="text-lg font-semibold">R{(payoutSummary?.pendingDrivers || 0).toFixed(2)}</div>
                </div>
                <div className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground">Pending platform</div>
                  <div className="text-lg font-semibold">R{(payoutSummary?.pendingPlatform || 0).toFixed(2)}</div>
                </div>
                <div className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground">Escrow held</div>
                  <div className="text-lg font-semibold">R{(payoutSummary?.escrowHeld || 0).toFixed(2)}</div>
                </div>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ps">Period start</Label>
                <Input id="ps" type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pe">Period end</Label>
                <Input id="pe" type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
              </div>
            </div>

            <Button className="w-full" onClick={processWeeklyPayouts} disabled={processingPayouts}>
              {processingPayouts ? 'Processing…' : 'Process Weekly Payouts'}
            </Button>
            <p className="text-xs text-muted-foreground">
              Aggregates unpaid earnings in the period and creates one payout per recipient (platform, laundry, driver).
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Payouts list + Mark as paid */}
      <Card>
        <CardHeader>
          <CardTitle>Payouts</CardTitle>
          <CardDescription>All payouts; mark as paid when the transfer is done.</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingPayoutsList ? (
            <div className="text-sm text-muted-foreground py-4">Loading…</div>
          ) : !payoutsList?.length ? (
            <div className="text-sm text-muted-foreground py-4">No payouts.</div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-[120px]">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payoutsList.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="text-xs">
                        {p.period_start && p.period_end ? `${p.period_start} – ${p.period_end}` : '—'}
                      </TableCell>
                      <TableCell>
                        <span className="capitalize">{p.recipient_type}</span>
                        {p.recipient_id && (
                          <span className="ml-1 font-mono text-xs text-muted-foreground">
                            {String(p.recipient_id).slice(0, 8)}…
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">R{Number(p.amount || 0).toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={p.status === 'completed' ? 'default' : 'secondary'}>{p.status}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {p.created_at ? new Date(p.created_at).toLocaleDateString() : '—'}
                      </TableCell>
                      <TableCell>
                        {p.status === 'pending' && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={markingPaidId === p.id}
                            onClick={() => markPayoutPaid(p.id)}
                          >
                            {markingPaidId === p.id ? '…' : 'Mark as paid'}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Earnings (from earnings table) */}
      <Card>
        <CardHeader>
          <CardTitle>Earnings</CardTitle>
          <CardDescription>Earnings created at status changes (driver per delivery, platform/laundry on order completion). Source for payouts.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3 flex-wrap items-end">
            <div className="space-y-2">
              <Label>From</Label>
              <Input type="date" value={earningsFrom} onChange={(e) => setEarningsFrom(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>To</Label>
              <Input type="date" value={earningsTo} onChange={(e) => setEarningsTo(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <select
                className="flex h-9 w-[120px] rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                value={earningsRecipientType}
                onChange={(e) => setEarningsRecipientType(e.target.value)}
              >
                <option value="">All</option>
                <option value="platform">Platform</option>
                <option value="laundry">Laundry</option>
                <option value="driver">Driver</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Paid</Label>
              <select
                className="flex h-9 w-[100px] rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                value={earningsPaidFilter}
                onChange={(e) => setEarningsPaidFilter(e.target.value as 'all' | 'paid' | 'unpaid')}
              >
                <option value="all">All</option>
                <option value="paid">Paid</option>
                <option value="unpaid">Unpaid</option>
              </select>
            </div>
            <Button variant="outline" onClick={() => refetchEarnings()} disabled={loadingEarnings}>
              Refresh
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">Platform (filtered)</div>
              <div className="font-semibold">R{earningsTotals.platform.toFixed(2)}</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">Laundry (filtered)</div>
              <div className="font-semibold">R{earningsTotals.laundry.toFixed(2)}</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">Driver (filtered)</div>
              <div className="font-semibold">R{earningsTotals.driver.toFixed(2)}</div>
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Paid at</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingEarnings ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">Loading…</TableCell>
                  </TableRow>
                ) : (earnings || []).length ? (
                  (earnings || []).slice(0, 100).map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-mono text-xs">{String(e.order_id).slice(0, 8)}…</TableCell>
                      <TableCell className="capitalize">{e.recipient_type}</TableCell>
                      <TableCell className="font-mono text-xs">{e.recipient_id ? String(e.recipient_id).slice(0, 8) + '…' : '—'}</TableCell>
                      <TableCell>R{Number(e.amount || 0).toFixed(2)}</TableCell>
                      <TableCell><Badge variant={e.paid ? 'default' : 'secondary'}>{e.paid ? 'Paid' : 'Unpaid'}</Badge></TableCell>
                      <TableCell className="text-muted-foreground text-sm">{e.paid_at ? new Date(e.paid_at).toLocaleDateString() : '—'}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{e.created_at ? new Date(e.created_at).toLocaleString() : '—'}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">No earnings found.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-muted-foreground">Up to 500 earnings (use filters).</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payments (customer)</CardTitle>
          <CardDescription>Customer payments per order. Earnings (above) are the source for payouts.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3 flex-wrap items-end">
            <div className="space-y-2">
              <Label>From</Label>
              <Input type="date" value={paymentsFrom} onChange={(e) => setPaymentsFrom(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>To</Label>
              <Input type="date" value={paymentsTo} onChange={(e) => setPaymentsTo(e.target.value)} />
            </div>
            <Button variant="outline" onClick={() => refetchPayments()} disabled={loadingPayments}>
              Refresh
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">Gross</div>
              <div className="font-semibold">R{totals.amount.toFixed(2)}</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">Commission</div>
              <div className="font-semibold">R{totals.commission.toFixed(2)}</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">Platform fee</div>
              <div className="font-semibold">R{totals.platformFee.toFixed(2)}</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">Laundry</div>
              <div className="font-semibold">R{totals.laundryPayout.toFixed(2)}</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">Drivers</div>
              <div className="font-semibold">R{totals.driverPayout.toFixed(2)}</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">Refunds</div>
              <div className="font-semibold">R{totals.refund.toFixed(2)}</div>
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Escrow</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Webhook</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingPayments ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : (payments || []).length ? (
                  (payments || []).map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs">{String(p.order_id).slice(0, 8)}…</TableCell>
                      <TableCell>R{Number(p.amount || 0).toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{String(p.status)}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{String(p.escrow_status)}</Badge>
                      </TableCell>
                      <TableCell className="capitalize">{String(p.payment_method || '—')}</TableCell>
                      <TableCell>
                        {p.webhook_processed_at ? (
                          <Badge variant="default">Processed</Badge>
                        ) : p.webhook_payload ? (
                          <Badge variant="secondary">Received</Badge>
                        ) : (
                          <Badge variant="secondary">—</Badge>
                        )}
                      </TableCell>
                      <TableCell>{p.created_at ? new Date(p.created_at).toLocaleString() : '—'}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      No payments found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-muted-foreground">
            Shows up to 200 recent payments (use date filters to narrow).
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

