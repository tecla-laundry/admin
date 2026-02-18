'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DriverTable } from '@/components/admin/driver-table'

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
          <DriverTable />
        </CardContent>
      </Card>
    </div>
  )
}
