'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from 'recharts'
import { format, subDays, startOfDay, endOfDay } from 'date-fns'
import { useAuth } from '@/contexts/auth-context'
import { useRealtime } from '@/hooks/use-realtime'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { AdminKpiCard } from '@/components/admin/kpi-card'
import {
  CubeIcon,
  SymbolIcon,
  PersonIcon,
  ArrowRightIcon,
  ExclamationTriangleIcon,
  CheckCircledIcon,
} from '@radix-ui/react-icons'
import { MapPin, Activity } from 'lucide-react'

const COLORS = ['hsl(var(--primary))', '#059669', '#64748B', '#F59E0B', '#8B5CF6']

// Fetch KPIs
async function fetchKPIs(
  supabase: ReturnType<typeof import('@/lib/supabase/client').createClient>
) {
  const today = startOfDay(new Date())
  const weekAgo = subDays(today, 7)
  const todayEnd = endOfDay(new Date())

  // Today's orders
  const { count: todayOrders } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', today.toISOString())
    .lte('created_at', todayEnd.toISOString())

  // This week's orders
  const { count: weekOrders } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', weekAgo.toISOString())

  // This week's revenue
  const { data: weekRevenueData } = await supabase
    .from('orders')
    .select('total_price, platform_fee, commission_amount')
    .gte('created_at', weekAgo.toISOString())
    .eq('status', 'completed')

  const grossRevenue = weekRevenueData?.reduce((sum, o) => sum + (o.total_price || 0), 0) || 0
  const platformCommission =
    weekRevenueData?.reduce(
      (sum, o) => sum + (o.platform_fee || 0) + (o.commission_amount || 0),
      0
    ) || 0

  // Active laundries
  const { count: activeLaundries } = await supabase
    .from('laundries')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')

  // Active drivers
  const { count: activeDrivers } = await supabase
    .from('drivers')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)

  // Pending approvals
  const { count: pendingApprovals } = await supabase
    .from('laundries')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending_approval')

  // Open disputes
  const { count: openDisputes } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'disputed')

  return {
    todayOrders: todayOrders || 0,
    weekOrders: weekOrders || 0,
    grossRevenue,
    platformCommission,
    activeLaundries: activeLaundries || 0,
    activeDrivers: activeDrivers || 0,
    pendingApprovals: pendingApprovals || 0,
    openDisputes: openDisputes || 0,
  }
}

// Fetch orders by status for last 30 days
async function fetchOrdersByStatus(
  supabase: ReturnType<typeof import('@/lib/supabase/client').createClient>
) {
  const thirtyDaysAgo = subDays(new Date(), 30)

  const { data: orders } = await supabase
    .from('orders')
    .select('status, created_at')
    .gte('created_at', thirtyDaysAgo.toISOString())

  if (!orders) return []

  const statusCounts: Record<string, number> = {}
  orders.forEach((order) => {
    statusCounts[order.status] = (statusCounts[order.status] || 0) + 1
  })

  return Object.entries(statusCounts).map(([status, count]) => ({
    status: status.replace(/_/g, ' '),
    count,
  }))
}

// Fetch revenue trend for last 30 days
async function fetchRevenueTrend(
  supabase: ReturnType<typeof import('@/lib/supabase/client').createClient>
) {
  const thirtyDaysAgo = subDays(new Date(), 30)

  const { data: orders } = await supabase
    .from('orders')
    .select('total_price, created_at')
    .gte('created_at', thirtyDaysAgo.toISOString())
    .eq('status', 'completed')
    .order('created_at', { ascending: true })

  if (!orders) return []

  // Group by date
  const dailyRevenue: Record<string, number> = {}
  orders.forEach((order) => {
    const date = format(new Date(order.created_at), 'yyyy-MM-dd')
    dailyRevenue[date] = (dailyRevenue[date] || 0) + (order.total_price || 0)
  })

  // Fill in missing dates with 0
  const result = []
  for (let i = 29; i >= 0; i--) {
    const date = format(subDays(new Date(), i), 'yyyy-MM-dd')
    result.push({
      date: format(new Date(date), 'MMM dd'),
      revenue: dailyRevenue[date] || 0,
    })
  }

  return result
}

// Fetch top 5 laundries by volume
async function fetchTopLaundries(
  supabase: ReturnType<typeof import('@/lib/supabase/client').createClient>
) {
  const thirtyDaysAgo = subDays(new Date(), 30)

  const { data: orders } = await supabase
    .from('orders')
    .select('laundry_id, laundries!inner(business_name)')
    .gte('created_at', thirtyDaysAgo.toISOString())
    .eq('status', 'completed')

  if (!orders) return []

  const laundryCounts: Record<string, { name: string; count: number }> = {}
  orders.forEach((order) => {
    const laundryId = order.laundry_id
    const laundry = Array.isArray(order.laundries) ? order.laundries[0] : order.laundries
    if (!laundryCounts[laundryId]) {
      laundryCounts[laundryId] = {
        name: laundry?.business_name || 'Unknown',
        count: 0,
      }
    }
    laundryCounts[laundryId].count++
  })

  return Object.values(laundryCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
}

// Fetch driver acceptance rate
async function fetchDriverAcceptanceRate(
  supabase: ReturnType<typeof import('@/lib/supabase/client').createClient>
) {
  const thirtyDaysAgo = subDays(new Date(), 30)

  const { data: requests } = await supabase
    .from('delivery_requests')
    .select('status')
    .gte('created_at', thirtyDaysAgo.toISOString())

  if (!requests || requests.length === 0) {
    return { accepted: 0, rejected: 0, pending: 0 }
  }

  const accepted = requests.filter((r) => r.status === 'accepted').length
  const rejected = requests.filter((r) => r.status === 'rejected').length
  const pending = requests.filter((r) => r.status === 'pending').length

  return { accepted, rejected, pending }
}

// Fetch active drivers with locations
async function fetchActiveDrivers(
  supabase: ReturnType<typeof import('@/lib/supabase/client').createClient>
) {
  const { data: drivers } = await supabase
    .from('drivers')
    .select('id, current_latitude, current_longitude, profiles!inner(full_name, email)')
    .eq('is_active', true)
    .not('current_latitude', 'is', null)
    .not('current_longitude', 'is', null)

  if (!drivers) return []

  return drivers.map((driver) => ({
    id: driver.id,
    name:
      (Array.isArray(driver.profiles) ? driver.profiles[0] : driver.profiles)?.full_name ||
      'Unknown',
    lat: driver.current_latitude,
    lng: driver.current_longitude,
  }))
}

// Fetch in-progress deliveries
async function fetchInProgressDeliveries(
  supabase: ReturnType<typeof import('@/lib/supabase/client').createClient>
) {
  const { data: deliveries } = await supabase
    .from('deliveries')
    .select('id, pickup_latitude, pickup_longitude, dropoff_latitude, dropoff_longitude, status')
    .in('status', ['assigned', 'in_progress', 'picked_up', 'out_for_delivery'])

  if (!deliveries) return []

  return deliveries.map((delivery) => ({
    id: delivery.id,
    pickup: {
      lat: delivery.pickup_latitude,
      lng: delivery.pickup_longitude,
    },
    dropoff: {
      lat: delivery.dropoff_latitude,
      lng: delivery.dropoff_longitude,
    },
    status: delivery.status,
  }))
}

// Fetch recent activity
async function fetchRecentActivity(
  supabase: ReturnType<typeof import('@/lib/supabase/client').createClient>
) {
  // Get recent order status changes
  const { data: statusHistory } = await supabase
    .from('order_status_history')
    .select('order_id, status, created_at, orders(id, customer_id, profiles!orders_customer_id_fkey(full_name))')
    .order('created_at', { ascending: false })
    .limit(5)

  // Get recent disputes
  const { data: disputes } = await supabase
    .from('orders')
    .select('id, created_at, customer_id, profiles!orders_customer_id_fkey(full_name)')
    .eq('status', 'disputed')
    .order('created_at', { ascending: false })
    .limit(3)

  // Get recent approvals
  const { data: approvals } = await supabase
    .from('laundries')
    .select('id, business_name, created_at')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(2)

  const activities: Array<{
    type: 'status_change' | 'dispute' | 'approval'
    title: string
    description: string
    timestamp: string
  }> = []

  statusHistory?.forEach((item) => {
    const order = Array.isArray(item.orders) ? item.orders[0] : item.orders
    const customer = order?.profiles
      ? Array.isArray(order.profiles)
        ? order.profiles[0]
        : order.profiles
      : null
    activities.push({
      type: 'status_change',
      title: `Order ${item.order_id.slice(0, 8)} status changed`,
      description: `Status: ${item.status.replace(/_/g, ' ')}`,
      timestamp: item.created_at,
    })
  })

  disputes?.forEach((dispute) => {
    const customer = dispute.profiles
      ? Array.isArray(dispute.profiles)
        ? dispute.profiles[0]
        : dispute.profiles
      : null
    activities.push({
      type: 'dispute',
      title: `New dispute: Order ${dispute.id.slice(0, 8)}`,
      description: `Customer: ${customer?.full_name || 'Unknown'}`,
      timestamp: dispute.created_at,
    })
  })

  approvals?.forEach((approval) => {
    activities.push({
      type: 'approval',
      title: `Laundry approved: ${approval.business_name}`,
      description: 'New partner joined the platform',
      timestamp: approval.created_at,
    })
  })

  return activities
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 10)
}

export function Dashboard() {
  const { supabase } = useAuth()

  // Fetch all data
  const { data: kpis, isLoading: kpisLoading } = useQuery({
    queryKey: ['dashboard', 'kpis'],
    queryFn: () => fetchKPIs(supabase),
    refetchInterval: 60000, // Refetch every minute
  })

  const { data: ordersByStatus, isLoading: ordersByStatusLoading } = useQuery({
    queryKey: ['dashboard', 'orders-by-status'],
    queryFn: () => fetchOrdersByStatus(supabase),
  })

  const { data: revenueTrend, isLoading: revenueTrendLoading } = useQuery({
    queryKey: ['dashboard', 'revenue-trend'],
    queryFn: () => fetchRevenueTrend(supabase),
  })

  const { data: topLaundries, isLoading: topLaundriesLoading } = useQuery({
    queryKey: ['dashboard', 'top-laundries'],
    queryFn: () => fetchTopLaundries(supabase),
  })

  const { data: driverAcceptance, isLoading: driverAcceptanceLoading } = useQuery({
    queryKey: ['dashboard', 'driver-acceptance'],
    queryFn: () => fetchDriverAcceptanceRate(supabase),
  })

  const { data: activeDrivers, isLoading: activeDriversLoading } = useQuery({
    queryKey: ['dashboard', 'active-drivers'],
    queryFn: () => fetchActiveDrivers(supabase),
    refetchInterval: 30000, // Refetch every 30 seconds
  })

  const { data: inProgressDeliveries, isLoading: deliveriesLoading } = useQuery({
    queryKey: ['dashboard', 'in-progress-deliveries'],
    queryFn: () => fetchInProgressDeliveries(supabase),
    refetchInterval: 30000,
  })

  const { data: recentActivity, isLoading: activityLoading } = useQuery({
    queryKey: ['dashboard', 'recent-activity'],
    queryFn: () => fetchRecentActivity(supabase),
    refetchInterval: 30000,
  })

  // Real-time subscriptions
  useRealtime({
    table: 'orders',
    queryKeys: [['dashboard', 'kpis'], ['dashboard', 'orders-by-status'], ['dashboard', 'revenue-trend']],
  })

  useRealtime({
    table: 'order_status_history',
    queryKeys: [['dashboard', 'recent-activity']],
  })

  useRealtime({
    table: 'drivers',
    queryKeys: [['dashboard', 'active-drivers']],
  })

  useRealtime({
    table: 'deliveries',
    queryKeys: [['dashboard', 'in-progress-deliveries']],
  })

  const kpiCards = useMemo(() => {
    if (!kpis) return []
    return [
      {
        title: 'Orders (Today)',
        value: kpis.todayOrders,
        icon: CubeIcon,
        description: 'Orders placed today',
      },
      {
        title: 'Orders (This Week)',
        value: kpis.weekOrders,
        icon: CubeIcon,
        description: 'Total orders this week',
      },
      {
        title: 'Gross Revenue',
        value: `R${kpis.grossRevenue.toFixed(2)}`,
        icon: SymbolIcon,
        description: 'Total revenue this week',
      },
      {
        title: 'Platform Commission',
        value: `R${kpis.platformCommission.toFixed(2)}`,
        icon: SymbolIcon,
        description: 'Platform earnings this week',
      },
      {
        title: 'Active Laundries',
        value: kpis.activeLaundries,
        icon: PersonIcon,
        description: 'Currently active partners',
      },
      {
        title: 'Active Drivers',
        value: kpis.activeDrivers,
        icon: ArrowRightIcon,
        description: 'Drivers currently online',
      },
      {
        title: 'Pending Approvals',
        value: kpis.pendingApprovals,
        icon: CheckCircledIcon,
        description: 'Laundries awaiting approval',
      },
      {
        title: 'Open Disputes',
        value: kpis.openDisputes,
        icon: ExclamationTriangleIcon,
        description: 'Orders requiring attention',
      },
    ]
  }, [kpis])

  const driverAcceptanceData = useMemo(() => {
    if (!driverAcceptance) return []
    const total = driverAcceptance.accepted + driverAcceptance.rejected + driverAcceptance.pending
    if (total === 0) return []
    return [
      { name: 'Accepted', value: driverAcceptance.accepted },
      { name: 'Rejected', value: driverAcceptance.rejected },
      { name: 'Pending', value: driverAcceptance.pending },
    ]
  }, [driverAcceptance])

  const greeting = useMemo(() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 18) return 'Good afternoon'
    return 'Good evening'
  }, [])

  return (
    <div className="space-y-6">
      {/* Hero */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative rounded-2xl overflow-hidden min-h-[140px] md:min-h-[160px] bg-gradient-to-br from-primary/20 via-primary/10 to-navy-900/10 dark:from-primary/15 dark:to-navy-900/30"
        aria-label="Dashboard overview"
      >
        <div className="relative z-10 flex flex-col justify-end p-6 md:p-8 h-full min-h-[140px] md:min-h-[160px]">
          <p className="text-sm font-medium text-foreground/90 mb-1">{greeting}</p>
          {kpisLoading ? (
            <Skeleton className="h-9 w-32 mb-1" />
          ) : (
            <p className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
              {kpis ? `${kpis.todayOrders} orders today` : '—'}
            </p>
          )}
          <p className="text-xs text-muted-foreground">Platform overview</p>
        </div>
      </motion.section>

      {/* KPI Cards */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
      >
        {kpisLoading
          ? Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} className="rounded-xl">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-20 mb-2" />
                  <Skeleton className="h-3 w-32" />
                </CardContent>
              </Card>
            ))
          : kpiCards.map((kpi, i) => (
              <AdminKpiCard
                key={kpi.title}
                title={kpi.title}
                value={kpi.value}
                numericValue={
                  typeof kpi.value === 'number'
                    ? kpi.value
                    : typeof kpi.value === 'string' && kpi.value.startsWith('R')
                      ? parseFloat(kpi.value.replace(/[R,]/g, '')) || 0
                      : undefined
                }
                description={kpi.description}
                icon={kpi.icon}
                accent={i < 2 ? 'sage' : i < 4 ? 'muted' : 'sky'}
                loading={kpisLoading}
              />
            ))}
      </motion.div>

      {/* Charts */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="grid gap-4 md:grid-cols-2"
      >
        {/* Orders by Status */}
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle>Orders by Status</CardTitle>
            <CardDescription>Last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            {ordersByStatusLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : ordersByStatus && ordersByStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={ordersByStatus}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="status" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Revenue Trend */}
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
            <CardDescription>Last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            {revenueTrendLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : revenueTrend && revenueTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={revenueTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top 5 Laundries */}
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle>Top 5 Laundries by Volume</CardTitle>
            <CardDescription>Last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            {topLaundriesLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : topLaundries && topLaundries.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topLaundries} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={120} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#059669" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Driver Acceptance Rate */}
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle>Driver Acceptance Rate</CardTitle>
            <CardDescription>Last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            {driverAcceptanceLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : driverAcceptanceData && driverAcceptanceData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={driverAcceptanceData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {driverAcceptanceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Live Map Widget */}
      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Live Map
          </CardTitle>
          <CardDescription>
            Active drivers and in-progress deliveries
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeDriversLoading || deliveriesLoading ? (
            <Skeleton className="h-[400px] w-full" />
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h4 className="text-sm font-medium mb-2">Active Drivers ({activeDrivers?.length || 0})</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {activeDrivers && activeDrivers.length > 0 ? (
                      activeDrivers.map((driver) => (
                        <div
                          key={driver.id}
                          className="flex items-center justify-between p-2 rounded-xl border transition-colors hover:bg-muted/50"
                        >
                          <span className="text-sm">{driver.name}</span>
                          <Badge variant="secondary" className="text-xs">
                            {driver.lat?.toFixed(4)}, {driver.lng?.toFixed(4)}
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No active drivers</p>
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-2">
                    In-Progress Deliveries ({inProgressDeliveries?.length || 0})
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {inProgressDeliveries && inProgressDeliveries.length > 0 ? (
                      inProgressDeliveries.map((delivery) => (
                        <div
                          key={delivery.id}
                          className="flex items-center justify-between p-2 rounded-xl border transition-colors hover:bg-muted/50"
                        >
                          <span className="text-sm">Delivery {delivery.id.slice(0, 8)}</span>
                          <Badge variant="outline" className="text-xs">
                            {delivery.status.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No in-progress deliveries</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="rounded-xl border bg-muted p-4 text-center text-sm text-muted-foreground">
                <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Map visualization will be integrated with Google Maps or Leaflet</p>
                <p className="text-xs mt-1">
                  {activeDrivers?.length || 0} drivers and {inProgressDeliveries?.length || 0}{' '}
                  deliveries shown above
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity Feed */}
      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
          <CardDescription>Last 10 status changes, disputes, and approvals</CardDescription>
        </CardHeader>
        <CardContent>
          {activityLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : recentActivity && recentActivity.length > 0 ? (
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div
                  key={index}
                  className="flex items-start gap-4 p-3 rounded-xl border bg-card transition-colors hover:bg-muted/30"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge
                        variant={
                          activity.type === 'approval'
                            ? 'default'
                            : activity.type === 'dispute'
                              ? 'destructive'
                              : 'secondary'
                        }
                      >
                        {activity.type === 'approval'
                          ? 'Approval'
                          : activity.type === 'dispute'
                            ? 'Dispute'
                            : 'Status Change'}
                      </Badge>
                      <span className="text-sm font-medium">{activity.title}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{activity.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(activity.timestamp), 'MMM dd, yyyy HH:mm')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-[200px] items-center justify-center text-muted-foreground">
              No recent activity
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
