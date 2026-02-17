import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function LaundriesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Laundry Partners</h1>
        <p className="text-muted-foreground">
          Manage laundry partner applications and approvals
        </p>
      </div>

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">Pending Approval</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="more-info">More Info Needed</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pending Approvals</CardTitle>
              <CardDescription>
                Laundry applications awaiting review
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Data table with TanStack Table will be implemented here.
                Features: filters (location, capacity, rating, services), bulk approve/reject,
                detail view modal with photos, Google Maps pin, operating hours, bank details.
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Actions will call Edge Functions: approve_laundry_partner, reject_laundry_partner
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Laundries</CardTitle>
              <CardDescription>Currently active laundry partners</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Active laundries table with performance metrics
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rejected" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Rejected Applications</CardTitle>
              <CardDescription>Laundry applications that were rejected</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Rejected applications with reasons
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="more-info" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>More Info Needed</CardTitle>
              <CardDescription>Applications requiring additional information</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Applications flagged for more information via request_more_info_laundry Edge Function
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
