import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AnalyticsDashboard } from '@/components/admin/analytics-dashboard'

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics & Reports</h1>
        <p className="text-muted-foreground">
          Deep dive analytics and exportable reports
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Analytics Overview</CardTitle>
          <CardDescription>
            Geographic heat map, cohorts & retention, peak hours, and exportable reports
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AnalyticsDashboard />
        </CardContent>
      </Card>
    </div>
  )
}
