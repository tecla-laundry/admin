import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FinanceDashboard } from '@/components/admin/finance-dashboard'

export default function FinancePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Finance & Commissions</h1>
        <p className="text-muted-foreground">
          Manage commissions, payouts, and financial reports
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Finance Operations</CardTitle>
          <CardDescription>
            Commission settings, payouts, earnings reports, and payment webhook status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FinanceDashboard />
        </CardContent>
      </Card>
    </div>
  )
}
