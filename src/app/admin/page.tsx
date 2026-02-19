import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/server'
import { CubeIcon, SymbolIcon, PersonIcon, ArrowRightIcon, ExclamationTriangleIcon, CheckCircledIcon, ArrowUpIcon } from '@radix-ui/react-icons'

export default async function AdminDashboard() {
  const supabase = await createClient()

  // Fetch KPIs (placeholder queries - replace with actual queries)
  // These are example queries that should be replaced with real data
  const { count: totalOrders } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

  const { count: pendingApprovals } = await supabase
    .from('laundries')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')

  const { count: activeLaundries } = await supabase
    .from('laundries')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')

  const { count: activeDrivers } = await supabase
    .from('drivers')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)

  const { count: openDisputes } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'disputed')

  const kpis = [
    {
      title: 'Orders (This Week)',
      value: totalOrders || 0,
      icon: CubeIcon,
      description: 'Total orders in the last 7 days',
    },
    {
      title: 'Gross Revenue',
      value: 'R0.00',
      icon: SymbolIcon,
      description: 'Total revenue this week',
    },
    {
      title: 'Active Laundries',
      value: activeLaundries || 0,
      icon: PersonIcon,
      description: 'Currently active partners',
    },
    {
      title: 'Active Drivers',
      value: activeDrivers || 0,
      icon: ArrowRightIcon,
      description: 'Drivers currently online',
    },
    {
      title: 'Pending Approvals',
      value: pendingApprovals || 0,
      icon: CheckCircledIcon,
      description: 'Laundries awaiting approval',
    },
    {
      title: 'Open Disputes',
      value: openDisputes || 0,
      icon: ExclamationTriangleIcon,
      description: 'Orders requiring attention',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your platform metrics and activity
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {kpis.map((kpi) => {
          const Icon = kpi.icon
          return (
            <Card key={kpi.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpi.value}</div>
                <p className="text-xs text-muted-foreground">{kpi.description}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Orders by Status</CardTitle>
            <CardDescription>Last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-[300px] items-center justify-center text-muted-foreground">
              Chart placeholder - Orders by status (Recharts)
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
            <CardDescription>Last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-[300px] items-center justify-center text-muted-foreground">
              Chart placeholder - Revenue trend (Recharts)
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Recent activity and changes across the platform</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Recent activity and changes will be displayed here with real-time updates
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
