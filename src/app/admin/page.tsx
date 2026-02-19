'use client'

import { Dashboard } from '@/components/admin/dashboard'

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your platform metrics and activity
        </p>
      </div>
      <Dashboard />
    </div>
  )
}
