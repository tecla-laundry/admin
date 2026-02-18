import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DisputesTable } from '@/components/admin/disputes-table'

export default function DisputesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Disputes & Issues</h1>
        <p className="text-muted-foreground">
          Resolve disputes and handle reported issues
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Open Disputes</CardTitle>
          <CardDescription>
            Orders with status = 'disputed' or issues reported by any party
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DisputesTable />
        </CardContent>
      </Card>
    </div>
  )
}
