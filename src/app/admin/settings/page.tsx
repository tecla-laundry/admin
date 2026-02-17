import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Platform Settings</h1>
        <p className="text-muted-foreground">
          Configure platform-wide settings and feature flags
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coverage Areas</CardTitle>
          <CardDescription>
            Configure service coverage areas and default radius
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Coverage area settings (Johannesburg area focus: Randburg, Bryanston, Sandton)
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dispatch Settings</CardTitle>
          <CardDescription>
            Configure dispatch timeouts and driver matching parameters
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Dispatch timeout settings and configuration
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notification Templates</CardTitle>
          <CardDescription>
            Manage email and SMS notification templates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Notification template management
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Feature Flags</CardTitle>
          <CardDescription>
            Global feature flags (e.g., driver model enabled)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Feature flag toggles for platform features
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
