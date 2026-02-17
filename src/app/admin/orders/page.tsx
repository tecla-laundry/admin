import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

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
          <p className="text-sm text-muted-foreground">
            Data table with TanStack Table will be implemented here.
            Features: filters (status, date range, customer, laundry, driver, amount),
            detail drawer with full timeline, all photos (pickup/dropoff), OTPs, signatures,
            driver live tracking link, manual intervention (force status change with audit log),
            re-dispatch driver (calls dispatch_driver Edge Function), export to CSV.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
