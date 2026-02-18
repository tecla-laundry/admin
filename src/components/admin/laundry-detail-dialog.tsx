'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
// Using img tag instead of Next Image for dynamic Supabase Storage URLs
import { toast } from 'sonner'
import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { Input } from '@/components/ui/input'
import { logAdminAudit } from '@/lib/admin-audit'

interface Laundry {
  id: string
  business_name: string
  owner_name: string
  email: string
  phone: string
  physical_address: string
  latitude: number
  longitude: number
  status: string
  services_offered: string[]
  price_per_kg: number
  capacity_per_day: number
  operating_hours: Record<string, { open: string; close: string }>
  photos: string[] | null
  rating: number
  total_reviews: number
  is_verified: boolean
  created_at: string
  rejection_reason?: string
  bank_details?: any | null
}

interface LaundryDetailDialogProps {
  laundry: Laundry | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onApproved?: () => void
  onRejected?: () => void
  onUpdated?: () => void
}

export function LaundryDetailDialog({
  laundry,
  open,
  onOpenChange,
  onApproved,
  onRejected,
  onUpdated,
}: LaundryDetailDialogProps) {
  const [loading, setLoading] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const { supabase } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [businessName, setBusinessName] = useState(laundry?.business_name ?? '')
  const [address, setAddress] = useState(laundry?.physical_address ?? '')
  const [pricePerKg, setPricePerKg] = useState<string>(
    laundry ? String(laundry.price_per_kg) : ''
  )
  const [capacityPerDay, setCapacityPerDay] = useState<string>(
    laundry ? String(laundry.capacity_per_day) : ''
  )
  const [servicesRaw, setServicesRaw] = useState<string>(
    laundry ? laundry.services_offered.join(', ') : ''
  )

  useEffect(() => {
    if (laundry) {
      setBusinessName(laundry.business_name)
      setAddress(laundry.physical_address)
      setPricePerKg(String(laundry.price_per_kg))
      setCapacityPerDay(String(laundry.capacity_per_day))
      setServicesRaw(laundry.services_offered.join(', '))
      setIsEditing(false)
      setRejectReason('')
    }
  }, [laundry, open])

  if (!laundry) return null

  const handleApprove = async () => {
    if (!laundry) return
    setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('approve_laundry_partner', {
        body: { laundry_id: laundry.id },
      })

      if (error) throw error

      toast.success('Laundry partner approved successfully')
      onApproved?.()
      onOpenChange(false)
    } catch (error: any) {
      toast.error(error.message || 'Failed to approve laundry partner')
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async () => {
    if (!laundry || !rejectReason.trim()) {
      toast.error('Please provide a rejection reason')
      return
    }
    setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('reject_laundry_partner', {
        body: { laundry_id: laundry.id, reason: rejectReason },
      })

      if (error) throw error

      toast.success('Laundry partner rejected')
      onRejected?.()
      onOpenChange(false)
      setRejectReason('')
    } catch (error: any) {
      toast.error(error.message || 'Failed to reject laundry partner')
    } finally {
      setLoading(false)
    }
  }

  const getPhotoUrl = (photoPath: string) => {
    // If it's already a full URL, return it
    if (photoPath.startsWith('http')) return photoPath
    // Otherwise, get signed URL from Supabase Storage
    const { data } = supabase.storage.from('laundry-photos').getPublicUrl(photoPath)
    return data.publicUrl
  }

  const mapUrl = `https://www.google.com/maps?q=${laundry.latitude},${laundry.longitude}`

  const handleSaveChanges = async () => {
    if (!laundry) return

    const updates: any = {}
    const criticalChanged: string[] = []

    if (businessName.trim() && businessName.trim() !== laundry.business_name) {
      updates.business_name = businessName.trim()
      criticalChanged.push('business_name')
    }
    if (address.trim() && address.trim() !== laundry.physical_address) {
      updates.physical_address = address.trim()
      criticalChanged.push('physical_address')
    }

    const parsedPrice = Number(pricePerKg)
    if (!Number.isNaN(parsedPrice) && parsedPrice !== laundry.price_per_kg) {
      updates.price_per_kg = parsedPrice
      criticalChanged.push('price_per_kg')
    }

    const parsedCapacity = Number(capacityPerDay)
    if (!Number.isNaN(parsedCapacity) && parsedCapacity !== laundry.capacity_per_day) {
      updates.capacity_per_day = parsedCapacity
      criticalChanged.push('capacity_per_day')
    }

    const services = servicesRaw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    if (services.length && JSON.stringify(services) !== JSON.stringify(laundry.services_offered)) {
      updates.services_offered = services
      criticalChanged.push('services_offered')
    }

    if (Object.keys(updates).length === 0) {
      toast.error('No changes to save')
      return
    }

    // Critical changes on an active laundry trigger re-approval.
    const isActive = laundry.status === 'active'
    if (isActive && criticalChanged.length > 0) {
      updates.status = 'pending_approval'
      updates.is_verified = false
    }

    setLoading(true)
    try {
      const { error } = await supabase
        .from('laundries')
        .update(updates)
        .eq('id', laundry.id)

      if (error) throw error

      try {
        await logAdminAudit(supabase, {
          action: 'update_settings',
          targetType: 'laundry',
          targetId: laundry.id,
          details: {
            fields_changed: criticalChanged,
            triggered_reapproval: isActive && criticalChanged.length > 0,
          },
        })
      } catch {
        // best-effort audit
      }

      toast.success(
        isActive && criticalChanged.length > 0
          ? 'Changes saved. Laundry sent back to pending approval.'
          : 'Changes saved.'
      )
      setIsEditing(false)
      onUpdated?.()
      onOpenChange(false)
    } catch (error: any) {
      toast.error(error.message || 'Failed to save changes')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{laundry.business_name}</DialogTitle>
          <DialogDescription>
            Laundry partner details and approval actions
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Business Name</Label>
              {isEditing ? (
                <Input
                  className="mt-1"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                />
              ) : (
                <p className="text-sm font-medium">{laundry.business_name}</p>
              )}
            </div>
            <div>
              <Label>Owner Name</Label>
              <p className="text-sm font-medium">{laundry.owner_name}</p>
            </div>
            <div>
              <Label>Email</Label>
              <p className="text-sm font-medium">{laundry.email}</p>
            </div>
            <div>
              <Label>Phone</Label>
              <p className="text-sm font-medium">{laundry.phone}</p>
            </div>
            <div className="col-span-2">
              <Label>Address</Label>
              {isEditing ? (
                <Input
                  className="mt-1"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              ) : (
                <p className="text-sm font-medium">{laundry.physical_address}</p>
              )}
              <a
                href={mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline mt-1 inline-block"
              >
                View on Google Maps
              </a>
            </div>
          </div>

          {/* Services & Pricing */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Services Offered</Label>
              {isEditing ? (
                <Input
                  className="mt-1"
                  value={servicesRaw}
                  onChange={(e) => setServicesRaw(e.target.value)}
                  placeholder="wash_and_fold, dry_clean, iron_only..."
                />
              ) : (
                <div className="flex flex-wrap gap-2 mt-1">
                  {laundry.services_offered.map((service) => (
                    <span
                      key={service}
                      className="px-2 py-1 text-xs bg-muted rounded-md"
                    >
                      {service.replace('_', ' ')}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div>
              <Label>Price per kg</Label>
              {isEditing ? (
                <Input
                  className="mt-1"
                  type="number"
                  step="0.01"
                  value={pricePerKg}
                  onChange={(e) => setPricePerKg(e.target.value)}
                />
              ) : (
                <p className="text-sm font-medium">R{laundry.price_per_kg.toFixed(2)}</p>
              )}
            </div>
            <div>
              <Label>Daily Capacity</Label>
              {isEditing ? (
                <Input
                  className="mt-1"
                  type="number"
                  value={capacityPerDay}
                  onChange={(e) => setCapacityPerDay(e.target.value)}
                />
              ) : (
                <p className="text-sm font-medium">{laundry.capacity_per_day} kg</p>
              )}
            </div>
            <div>
              <Label>Rating</Label>
              <p className="text-sm font-medium">
                {laundry.rating.toFixed(1)} ({laundry.total_reviews} reviews)
              </p>
            </div>
          </div>

          {/* Operating Hours */}
          <div>
            <Label>Operating Hours</Label>
            <div className="mt-2 space-y-1">
              {Object.entries(laundry.operating_hours).map(([day, hours]) => (
                <div key={day} className="flex justify-between text-sm">
                  <span className="capitalize">{day}</span>
                  <span>
                    {hours.open} - {hours.close}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Photos */}
          {laundry.photos && laundry.photos.length > 0 && (
            <div>
              <Label>Photos</Label>
              <div className="grid grid-cols-3 gap-4 mt-2">
                {laundry.photos.map((photo, index) => (
                  <div key={index} className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                    <img
                      src={getPhotoUrl(photo)}
                      alt={`${laundry.business_name} photo ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rejection Reason (if rejected) */}
          {laundry.status === 'rejected' && laundry.rejection_reason && (
            <div>
              <Label>Rejection Reason</Label>
              <p className="text-sm text-destructive mt-1">{laundry.rejection_reason}</p>
            </div>
          )}

          {/* Bank Details (masked) */}
          {laundry.bank_details && (
            <div>
              <Label>Bank Details (masked)</Label>
              <div className="mt-1 text-sm">
                <p>
                  Bank:{' '}
                  {typeof laundry.bank_details.bank_name === 'string'
                    ? laundry.bank_details.bank_name
                    : '—'}
                </p>
                <p>
                  Account:{' '}
                  {typeof laundry.bank_details.account_number === 'string'
                    ? `****${laundry.bank_details.account_number.slice(-4)}`
                    : '—'}
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          {laundry.status === 'pending_approval' && (
            <div className="space-y-4 pt-4 border-t">
              <div>
                <Label htmlFor="reject-reason">Rejection Reason (required for reject)</Label>
                <textarea
                  id="reject-reason"
                  className="w-full mt-1 p-2 border rounded-md"
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Enter reason for rejection..."
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="destructive"
                  onClick={handleReject}
                  disabled={loading || !rejectReason.trim()}
                >
                  {loading ? 'Rejecting...' : 'Reject'}
                </Button>
                <Button onClick={handleApprove} disabled={loading}>
                  {loading ? 'Approving...' : 'Approve'}
                </Button>
              </div>
            </div>
          )}

          {/* Admin Edit */}
          <div className="space-y-2 pt-4 border-t">
            <div className="flex items-center justify-between">
              <Label>Admin Edit</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing((prev) => !prev)}
                disabled={loading}
              >
                {isEditing ? 'Cancel' : 'Edit Profile'}
              </Button>
            </div>
            {isEditing && (
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(false)}
                  disabled={loading}
                >
                  Discard
                </Button>
                <Button size="sm" onClick={handleSaveChanges} disabled={loading}>
                  Save Changes
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
