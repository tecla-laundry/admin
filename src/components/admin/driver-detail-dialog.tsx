'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/contexts/auth-context'
import { toast } from 'sonner'
import { logAdminAudit } from '@/lib/admin-audit'
import { MapPin, Phone, Mail, Calendar, Car, Award, TrendingUp, DollarSign } from 'lucide-react'

interface Driver {
  id: string
  user_id: string
  is_active: boolean
  current_latitude: number | null
  current_longitude: number | null
  license_number: string
  vehicle_type: string
  vehicle_registration: string
  rating: number | null
  acceptance_rate: number | null
  on_time_percentage: number | null
  current_load: number
  total_deliveries: number
  profile: {
    full_name: string | null
    email: string
  }
  total_earnings: number
}

interface DriverDetailDialogProps {
  driver: Driver | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdated?: () => void
}

export function DriverDetailDialog({
  driver,
  open,
  onOpenChange,
  onUpdated,
}: DriverDetailDialogProps) {
  const { supabase } = useAuth()
  const [loading, setLoading] = useState(false)
  const [driverDetails, setDriverDetails] = useState<any>(null)
  const [deliveries, setDeliveries] = useState<any[]>([])
  const [issues, setIssues] = useState<any[]>([])

  useEffect(() => {
    if (driver && open) {
      fetchDriverDetails()
    }
  }, [driver, open])

  const fetchDriverDetails = async () => {
    if (!driver) return

    try {
      // Fetch full driver details
      const { data: driverData, error: driverError } = await supabase
        .from('drivers')
        .select('*')
        .eq('id', driver.id)
        .single()

      if (driverError) throw driverError

      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', driver.user_id)
        .single()

      // Fetch completed deliveries
      const { data: deliveriesData } = await supabase
        .from('deliveries')
        .select(`
          *,
          orders (
            id,
            status,
            total_price,
            created_at
          )
        `)
        .eq('driver_id', driver.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(10)

      // Fetch delivery issues
      const { data: issuesData } = await supabase
        .from('delivery_issues')
        .select('*')
        .eq('driver_id', driver.id)
        .order('created_at', { ascending: false })
        .limit(10)

      setDriverDetails({ ...driverData, profile: profileData })
      setDeliveries(deliveriesData || [])
      setIssues(issuesData || [])
    } catch (error: any) {
      console.error('Error fetching driver details:', error)
      toast.error('Failed to load driver details')
    }
  }

  const handleToggleActive = async () => {
    if (!driver) return
    setLoading(true)
    try {
      const { error } = await supabase
        .from('drivers')
        .update({ is_active: !driver.is_active })
        .eq('id', driver.id)

      if (error) throw error

      // Log to audit
      try {
        await logAdminAudit(supabase, {
          action: driver.is_active ? 'suspend_driver' : 'activate_driver',
          targetType: 'driver',
          targetId: driver.id,
          details: { is_active: !driver.is_active },
        })
      } catch {}

      toast.success(`Driver ${driver.is_active ? 'suspended' : 'activated'} successfully`)
      onUpdated?.()
      fetchDriverDetails()
    } catch (error: any) {
      toast.error(error.message || 'Failed to update driver status')
    } finally {
      setLoading(false)
    }
  }

  if (!driver || !driverDetails) return null

  const mapUrl = driver.current_latitude && driver.current_longitude
    ? `https://www.google.com/maps?q=${driver.current_latitude},${driver.current_longitude}`
    : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Driver Details</DialogTitle>
          <DialogDescription>
            View driver information, performance metrics, and activity
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Basic Information</CardTitle>
                <Badge variant={driver.is_active ? 'default' : 'secondary'}>
                  {driver.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Name</p>
                  <p className="text-sm">{driverDetails.profile?.full_name || driverDetails.profile?.email || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <p className="text-sm flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    {driverDetails.profile?.email || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">License Number</p>
                  <p className="text-sm">{driverDetails.license_number}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">License Expiry</p>
                  <p className="text-sm flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {driverDetails.license_expiry
                      ? new Date(driverDetails.license_expiry).toLocaleDateString()
                      : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Vehicle Type</p>
                  <p className="text-sm flex items-center gap-2 capitalize">
                    <Car className="h-4 w-4" />
                    {driverDetails.vehicle_type}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Vehicle Registration</p>
                  <p className="text-sm">{driverDetails.vehicle_registration}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Performance Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Award className="h-4 w-4" />
                    Rating
                  </p>
                  <p className="text-2xl font-bold">
                    {driverDetails.rating ? `${driverDetails.rating.toFixed(1)} ⭐` : 'N/A'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Acceptance Rate
                  </p>
                  <p className="text-2xl font-bold">
                    {driverDetails.acceptance_rate
                      ? `${driverDetails.acceptance_rate.toFixed(1)}%`
                      : 'N/A'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    On-Time %
                  </p>
                  <p className="text-2xl font-bold">
                    {driverDetails.on_time_percentage
                      ? `${driverDetails.on_time_percentage.toFixed(1)}%`
                      : 'N/A'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Total Earnings
                  </p>
                  <p className="text-2xl font-bold">
                    R{driver.total_earnings.toFixed(2)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Total Deliveries</p>
                  <p className="text-2xl font-bold">{driverDetails.total_deliveries || 0}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Current Load</p>
                  <p className="text-2xl font-bold">{driverDetails.current_load || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Live Location */}
          {driver.is_active && driver.current_latitude && driver.current_longitude && (
            <Card>
              <CardHeader>
                <CardTitle>Live Location</CardTitle>
                <CardDescription>
                  Last updated:{' '}
                  {driverDetails.last_location_updated_at
                    ? new Date(driverDetails.last_location_updated_at).toLocaleString()
                    : 'N/A'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm">
                    <MapPin className="h-4 w-4 inline mr-2" />
                    {driver.current_latitude.toFixed(6)}, {driver.current_longitude.toFixed(6)}
                  </p>
                  {mapUrl && (
                    <a
                      href={mapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline"
                    >
                      View on Google Maps →
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Deliveries */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Deliveries</CardTitle>
              <CardDescription>Last 10 completed deliveries</CardDescription>
            </CardHeader>
            <CardContent>
              {deliveries.length > 0 ? (
                <div className="space-y-2">
                  {deliveries.map((delivery) => (
                    <div
                      key={delivery.id}
                      className="flex items-center justify-between p-2 border rounded"
                    >
                      <div>
                        <p className="text-sm font-medium">Order #{delivery.order_id?.slice(0, 8)}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(delivery.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          R{delivery.orders?.total_price?.toFixed(2) || '0.00'}
                        </p>
                        <Badge variant="outline" className="text-xs">
                          {delivery.orders?.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No deliveries yet</p>
              )}
            </CardContent>
          </Card>

          {/* Reported Issues */}
          {issues.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Reported Issues</CardTitle>
                <CardDescription>Issues reported for this driver</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {issues.map((issue) => (
                    <div key={issue.id} className="p-2 border rounded bg-red-50">
                      <p className="text-sm font-medium">{issue.issue_type}</p>
                      <p className="text-xs text-muted-foreground">{issue.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(issue.created_at).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button
              variant={driver.is_active ? 'destructive' : 'default'}
              onClick={handleToggleActive}
              disabled={loading}
            >
              {driver.is_active ? 'Suspend Driver' : 'Activate Driver'}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
