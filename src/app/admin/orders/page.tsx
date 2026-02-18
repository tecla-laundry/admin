'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { OrderTable } from '@/components/admin/order-table'

export default function OrdersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Orders & Deliveries</h1>
        <p className="text-muted-foreground">
          Monitor and manage all orders across the platform
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Orders</CardTitle>
          <CardDescription>
            Unified table of all orders with full status machine (pending → completed)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OrderTable />
        </CardContent>
      </Card>
    </div>
  )
}
