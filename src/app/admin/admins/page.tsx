'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AdminInviteDialog } from '@/components/admin/admin-invite-dialog'
import { AdminsTable } from '@/components/admin/admins-table'

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
        <AdminInviteDialog />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Admins</CardTitle>
          <CardDescription>
            List of all admin users with access control
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AdminsTable />
        </CardContent>
      </Card>
    </div>
  )
}
