import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function AdminsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Management</h1>
          <p className="text-muted-foreground">
            Invite and manage admin users
          </p>
        </div>
        <Button>Invite Admin</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Admins</CardTitle>
          <CardDescription>
            List of all admin users with access control
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Admin users table will be implemented here.
            Features: invite new admin (calls invite_admin Edge Function),
            list active admins, revoke access.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
