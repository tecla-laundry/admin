import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function DriversPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Drivers</h1>
        <p className="text-muted-foreground">
          Manage driver accounts and monitor performance
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Drivers</CardTitle>
          <CardDescription>
            View and manage driver accounts, performance metrics, and live locations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Data table with TanStack Table will be implemented here.
            Features: filters (active/inactive, rating, acceptance rate, current load),
            approve/suspend/deactivate actions, live location map view,
            performance metrics (on-time %, acceptance rate, earnings),
            detail view with license, vehicle, completed deliveries, issues reported.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
