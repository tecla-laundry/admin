import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function FinancePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Finance & Commissions</h1>
        <p className="text-muted-foreground">
          Manage commissions, payouts, and financial reports
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Commission Management</CardTitle>
            <CardDescription>
              Global rate (default 15%) + per-laundry overrides
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Commission settings and overrides will be configured here
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payout Overview</CardTitle>
            <CardDescription>
              Pending laundry payouts, driver payouts, escrow balance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Payout summary and balances
              </p>
              <Button className="w-full">
                Process Weekly Payouts
              </Button>
              <p className="text-xs text-muted-foreground">
                Calls process_payouts Edge Function
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Earnings Reports</CardTitle>
          <CardDescription>
            Detailed earnings breakdown (laundry vs driver vs platform)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Earnings reports and payment table with webhook status will be displayed here
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
