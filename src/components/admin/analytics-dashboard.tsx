'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import { toast } from 'sonner'

import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'

type OrderRow = {
  id: string
  created_at: string
  status: string
  total_price?: number
  pickup_address?: string
}

type ProfileRow = {
  id: string
  created_at: string
}

async function fetchOrdersAndProfiles(
  supabase: ReturnType<typeof import('@/lib/supabase/client').createClient>,
  from?: string,
  to?: string
) {
  let o = supabase.from('orders').select('id,created_at,status,total_price,pickup_address').order('created_at', {
    ascending: true,
  })
  if (from) o = o.gte('created_at', from)
  if (to) o = o.lte('created_at', to)
  const { data: orders, error: ordersErr } = await o
  if (ordersErr) throw ordersErr

  let p = supabase.from('profiles').select('id,created_at').order('created_at', { ascending: true })
  if (from) p = p.gte('created_at', from)
  if (to) p = p.lte('created_at', to)
  const { data: profiles, error: profilesErr } = await p
  if (profilesErr) throw profilesErr

  return {
    orders: (orders || []) as OrderRow[],
    profiles: (profiles || []) as ProfileRow[],
  }
}

function dateKey(d: string | Date) {
  const asDate = typeof d === 'string' ? parseISO(d) : d
  return format(asDate, 'yyyy-MM-dd')
}

function hourKey(d: string | Date) {
  const asDate = typeof d === 'string' ? parseISO(d) : d
  return format(asDate, 'HH:00')
}

function classifyRegion(address?: string) {
  if (!address) return 'Other'
  const lower = address.toLowerCase()
  if (lower.includes('randburg')) return 'Randburg'
  if (lower.includes('bryanston')) return 'Bryanston'
  if (lower.includes('sandton')) return 'Sandton'
  return 'Other'
}

function buildGeoHeat(orders: OrderRow[]) {
  const counts: Record<string, number> = {
    Randburg: 0,
    Bryanston: 0,
    Sandton: 0,
    Other: 0,
  }
  for (const o of orders) {
    counts[classifyRegion(o.pickup_address)] += 1
  }
  return Object.entries(counts).map(([region, value]) => ({ region, value }))
}

function buildPeakHours(orders: OrderRow[]) {
  const buckets: Record<string, number> = {}
  for (const o of orders) {
    const k = hourKey(o.created_at)
    buckets[k] = (buckets[k] || 0) + 1
  }
  return Object.entries(buckets)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([hour, count]) => ({ hour, count }))
}

function buildCohorts(profiles: ProfileRow[], orders: OrderRow[]) {
  // Very simple cohort: by signup month, then count orders in subsequent months.
  const cohorts: Record<string, { signupMonth: string; month: string; users: number; orders: number }> = {}
  const userSignupMonth: Record<string, string> = {}

  for (const p of profiles) {
    const m = format(parseISO(p.created_at), 'yyyy-MM')
    userSignupMonth[p.id] = m
  }

  for (const pId of Object.keys(userSignupMonth)) {
    const m = userSignupMonth[pId]
    const key = `${m}:${m}`
    if (!cohorts[key]) cohorts[key] = { signupMonth: m, month: m, users: 0, orders: 0 }
    cohorts[key].users += 1
  }

  for (const o of orders) {
    const oMonth = format(parseISO(o.created_at), 'yyyy-MM')
    // We don't have direct customer_id mapping in this admin typed subset; treat all orders aggregated by month.
    const key = `all:${oMonth}`
    if (!cohorts[key]) cohorts[key] = { signupMonth: 'all', month: oMonth, users: profiles.length, orders: 0 }
    cohorts[key].orders += 1
  }

  return Object.values(cohorts).sort((a, b) =>
    a.month === b.month ? a.signupMonth.localeCompare(b.signupMonth) : a.month.localeCompare(b.month)
  )
}

function exportCsv(filename: string, rows: any[], headers: string[], pick: (row: any) => any[]) {
  if (!rows.length) {
    toast.error('No data to export')
    return
  }
  const csv = [
    headers.join(','),
    ...rows.map((r) => pick(r).map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')),
  ].join('\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export function AnalyticsDashboard() {
  const { supabase } = useAuth()

  const [from, setFrom] = useState<string>('')
  const [to, setTo] = useState<string>('')

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['analytics', from, to],
    queryFn: () =>
      fetchOrdersAndProfiles(
        supabase,
        from ? new Date(`${from}T00:00:00.000Z`).toISOString() : undefined,
        to ? new Date(`${to}T23:59:59.999Z`).toISOString() : undefined
      ),
  })

  const orders = data?.orders || []
  const profiles = data?.profiles || []

  const geoData = useMemo(() => buildGeoHeat(orders), [orders])
  const peakData = useMemo(() => buildPeakHours(orders), [orders])
  const cohortData = useMemo(() => buildCohorts(profiles, orders), [profiles, orders])

  const handleExportCsv = () => {
    const rows = orders
    exportCsv(
      'orders_analytics.csv',
      rows,
      ['Order ID', 'Created At', 'Status', 'Total Price', 'Pickup Address', 'Region'],
      (o: OrderRow) => [
        o.id,
        o.created_at,
        o.status,
        o.total_price ?? '',
        o.pickup_address ?? '',
        classifyRegion(o.pickup_address),
      ]
    )
  }

  const handleExportPdf = () => {
    // For now, generate a basic print-friendly window and trigger print;
    // this lets admins "Save as PDF" from the browser.
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write('<html><head><title>Analytics Report</title></head><body>')
    w.document.write('<h1>Analytics Report</h1>')
    w.document.write(`<p>Generated at: ${new Date().toLocaleString()}</p>`)
    w.document.write(`<p>Total orders: ${orders.length}</p>`)
    w.document.write(`<p>Total users (profiles): ${profiles.length}</p>`)
    w.document.write('<h2>Region breakdown</h2>')
    w.document.write('<ul>')
    for (const row of geoData) {
      w.document.write(`<li>${row.region}: ${row.value}</li>`)
    }
    w.document.write('</ul>')
    w.document.write('</body></html>')
    w.document.close()
    w.print()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-2">
          <Label htmlFor="from">From</Label>
          <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="to">To</Label>
          <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
          Refresh
        </Button>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCsv}>
            Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPdf}>
            Export PDF
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Geographic Heat Map</div>
              <div className="text-xs text-muted-foreground">
                Orders by inferred pickup region (Randburg, Bryanston, Sandton, Other)
              </div>
            </div>
            <Badge variant="secondary">Johannesburg focus</Badge>
          </div>
          <div className="h-[260px] rounded-md border bg-card p-3">
            {geoData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No orders in selected range.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={geoData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="region" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#0f172a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Peak Hours</div>
              <div className="text-xs text-muted-foreground">Order volume by hour of day</div>
            </div>
          </div>
          <div className="h-[260px] rounded-md border bg-card p-3">
            {peakData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No orders in selected range.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={peakData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium">Cohort & Retention</div>
            <div className="text-xs text-muted-foreground">
              Simple monthly cohorts based on signups vs order activity
            </div>
          </div>
        </div>
        <div className="rounded-md border bg-card p-3 overflow-x-auto">
          {cohortData.length === 0 ? (
            <div className="flex h-[160px] items-center justify-center text-sm text-muted-foreground">
              Not enough data for cohorts.
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="py-2 pr-4 text-left">Signup Cohort</th>
                  <th className="py-2 pr-4 text-left">Month</th>
                  <th className="py-2 pr-4 text-right">Users</th>
                  <th className="py-2 pr-4 text-right">Orders</th>
                  <th className="py-2 pr-4 text-right">Orders / User</th>
                </tr>
              </thead>
              <tbody>
                {cohortData.map((row) => (
                  <tr key={`${row.signupMonth}-${row.month}`} className="border-b last:border-0">
                    <td className="py-1 pr-4">{row.signupMonth}</td>
                    <td className="py-1 pr-4">{row.month}</td>
                    <td className="py-1 pr-4 text-right">{row.users}</td>
                    <td className="py-1 pr-4 text-right">{row.orders}</td>
                    <td className="py-1 pr-4 text-right">
                      {row.users ? (row.orders / row.users).toFixed(2) : '0.00'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

