import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

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
          <p className="text-sm text-muted-foreground">
            Data table will be implemented here.
            Features: evidence viewer (photos, notes, signatures),
            resolve/refund/escalate actions (with reason),
            notification to all parties via Edge Function.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
