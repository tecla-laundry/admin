'use client'

import { useState, useEffect } from 'react'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/contexts/auth-context'
import { toast } from 'sonner'
import { logAdminAudit } from '@/lib/admin-audit'
import { useEdgeFunction } from '@/hooks/use-edge-function'
import {
  MapPin,
  Clock,
  DollarSign,
  Package,
  User,
  Building,
  Truck,
  Image as ImageIcon,
  FileText,
  RefreshCw,
  AlertCircle,
  XCircle,
} from 'lucide-react'
import { format } from 'date-fns'

type OrderStatus =
  | 'pending'
  | 'laundry_requested'
  | 'accepted'
  | 'rejected'
  | 'driver_pickup_assigned'
  | 'pickup_in_progress'
  | 'picked_up'
  | 'at_laundry'
  | 'washing_in_progress'
  | 'ready_for_delivery'
  | 'driver_delivery_assigned'
  | 'delivery_in_progress'
  | 'completed'
  | 'cancelled'
  | 'disputed'

interface Order {
  id: string
  customer_id: string
  laundry_id: string
  status: OrderStatus
  total_price: number
  service_fee: number
  pickup_fee: number
  commission_amount: number
  platform_fee: number
  pickup_address: string
  pickup_latitude: number
  pickup_longitude: number
  dropoff_address: string
  dropoff_latitude: number
  dropoff_longitude: number
  scheduled_pickup_time: string
  estimated_completion_time: string | null
  total_weight_kg: number
  special_notes: string | null
  cancellation_reason: string | null
  cancelled_at: string | null
  cancelled_by: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
  customer: {
    full_name: string | null
    email: string
  }
  laundry: {
    business_name: string
  }
  driver: {
    id: string
    profile: {
      full_name: string | null
      email: string
    }
  } | null
}

interface OrderDetailDrawerProps {
  order: Order | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdated?: () => void
}

const ORDER_STATUSES: OrderStatus[] = [
  'pending',
  'laundry_requested',
  'accepted',
  'rejected',
  'driver_pickup_assigned',
  'pickup_in_progress',
  'picked_up',
  'at_laundry',
  'washing_in_progress',
  'ready_for_delivery',
  'driver_delivery_assigned',
  'delivery_in_progress',
  'completed',
  'cancelled',
  'disputed',
]

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: 'bg-gray-100 text-gray-800',
  laundry_requested: 'bg-blue-100 text-blue-800',
  accepted: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  driver_pickup_assigned: 'bg-yellow-100 text-yellow-800',
  pickup_in_progress: 'bg-yellow-100 text-yellow-800',
  picked_up: 'bg-purple-100 text-purple-800',
  at_laundry: 'bg-indigo-100 text-indigo-800',
  washing_in_progress: 'bg-indigo-100 text-indigo-800',
  ready_for_delivery: 'bg-cyan-100 text-cyan-800',
  driver_delivery_assigned: 'bg-yellow-100 text-yellow-800',
  delivery_in_progress: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  disputed: 'bg-orange-100 text-orange-800',
}

export function OrderDetailDrawer({
  order,
  open,
  onOpenChange,
  onUpdated,
}: OrderDetailDrawerProps) {
  const { supabase } = useAuth()
  const { invoke } = useEdgeFunction()
  const [loading, setLoading] = useState(false)
  const [orderDetails, setOrderDetails] = useState<any>(null)
  const [statusHistory, setStatusHistory] = useState<any[]>([])
  const [deliveries, setDeliveries] = useState<any[]>([])
  const [newStatus, setNewStatus] = useState<OrderStatus | ''>('')
  const [statusChangeReason, setStatusChangeReason] = useState('')

  useEffect(() => {
    if (order && open) {
      fetchOrderDetails()
    }
  }, [order, open])

  const fetchOrderDetails = async () => {
    if (!order) return

    try {
      // Fetch full order details with order items (no prices used for total)
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items(id, service_type, quantity, description)
        `)
        .eq('id', order.id)
        .single()

      if (orderError) throw orderError

      // Fetch status history
      const { data: historyData } = await supabase
        .from('order_status_history')
        .select(`
          *,
          profiles!order_status_history_performed_by_fkey (
            full_name,
            email
          )
        `)
        .eq('order_id', order.id)
        .order('performed_at', { ascending: true })

      // Fetch deliveries
      const { data: deliveriesData } = await supabase
        .from('deliveries')
        .select(`
          *,
          drivers!deliveries_driver_id_fkey (
            id,
            user_id,
            current_latitude,
            current_longitude,
            profiles!drivers_user_id_fkey (
              full_name,
              email
            )
          )
        `)
        .eq('order_id', order.id)
        .order('created_at', { ascending: true })

      setOrderDetails(orderData)
      setStatusHistory(historyData || [])
      setDeliveries(deliveriesData || [])
    } catch (error: any) {
      console.error('Error fetching order details:', error)
      toast.error('Failed to load order details')
    }
  }

  const handleForceStatusChange = async () => {
    if (!order || !newStatus) {
      toast.error('Please select a new status')
      return
    }

    if (!statusChangeReason.trim()) {
      toast.error('Please provide a reason for the status change')
      return
    }

    setLoading(true)
    try {
      const { data, error } = await invoke('force_order_status', {
        body: {
          order_id: order.id,
          new_status: newStatus,
          reason: statusChangeReason,
        },
      })

      if (error) throw error

      // Log to audit
      try {
        await logAdminAudit(supabase, {
          action: 'force_order_status',
          targetType: 'order',
          targetId: order.id,
          details: {
            from_status: order.status,
            to_status: newStatus,
            reason: statusChangeReason,
          },
        })
      } catch {}

      toast.success('Order status updated successfully')
      setNewStatus('')
      setStatusChangeReason('')
      onUpdated?.()
      fetchOrderDetails()
    } catch (error: any) {
      toast.error(error.message || 'Failed to update order status')
    } finally {
      setLoading(false)
    }
  }

  // Redispatch: which leg needs a driver? Closest status between ready_for_delivery and accepted.
  // Before ready_for_delivery → pickup leg; at/after ready_for_delivery → return leg.
  const pickupStatuses: OrderStatus[] = [
    'accepted',
    'driver_pickup_assigned',
    'pickup_in_progress',
    'picked_up',
    'at_laundry',
    'washing_in_progress',
  ]
  const deliveryStatuses: OrderStatus[] = [
    'ready_for_delivery',
    'driver_delivery_assigned',
    'delivery_in_progress',
  ]
  const redispatchTaskType =
    pickupStatuses.includes(order.status) ? 'pickup' : deliveryStatuses.includes(order.status) ? 'delivery' : null

  const handleRedispatchDriver = async () => {
    if (!order || redispatchTaskType === null) {
      toast.error('Cannot re-dispatch for current order status')
      return
    }

    setLoading(true)
    try {
      const { data, error } = await invoke('dispatch_driver', {
        body: {
          order_id: order.id,
          task_type: redispatchTaskType,
        },
      })

      if (error) throw error

      try {
        await logAdminAudit(supabase, {
          action: 'redispatch_driver',
          targetType: 'order',
          targetId: order.id,
          details: { task_type: redispatchTaskType },
        })
      } catch {}

      toast.success(`Driver re-dispatch initiated (${redispatchTaskType})`)
      onUpdated?.()
      fetchOrderDetails()
    } catch (error: any) {
      toast.error(error.message || 'Failed to re-dispatch driver')
    } finally {
      setLoading(false)
    }
  }

  const handleCancelOrder = async () => {
    if (!order) return
    const reason = window.prompt('Reason for cancellation (required):')
    if (!reason?.trim()) {
      toast.error('Cancellation reason is required')
      return
    }
    setLoading(true)
    try {
      const { error } = await invoke('cancel_order', {
        body: { order_id: order.id, reason: reason.trim() },
      })
      if (error) throw error
      try {
        await logAdminAudit(supabase, {
          action: 'cancel_order',
          targetType: 'order',
          targetId: order.id,
          details: { reason: reason.trim() },
        })
      } catch {}
      toast.success('Order cancelled')
      onUpdated?.()
      fetchOrderDetails()
      onOpenChange(false)
    } catch (error: any) {
      toast.error(error?.message || 'Failed to cancel order')
    } finally {
      setLoading(false)
    }
  }

  if (!order || !orderDetails) return null

  const pickupMapUrl = `https://www.google.com/maps?q=${order.pickup_latitude},${order.pickup_longitude}`
  const dropoffMapUrl = `https://www.google.com/maps?q=${order.dropoff_latitude},${order.dropoff_longitude}`

  // Get driver location for live tracking
  const activeDelivery = deliveries.find(
    (d) => d.driver_id && (d.status === 'in_progress' || d.status === 'assigned')
  )
  const driverLocationUrl =
    activeDelivery?.drivers?.current_latitude && activeDelivery?.drivers?.current_longitude
      ? `https://www.google.com/maps?q=${activeDelivery.drivers.current_latitude},${activeDelivery.drivers.current_longitude}`
      : null

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader>
          <DrawerTitle>Order Details</DrawerTitle>
          <DrawerDescription>
            Order ID: {order.id.slice(0, 8)}... | Status:{' '}
            <Badge className={STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-800'}>
              {order.status.replace(/_/g, ' ')}
            </Badge>
          </DrawerDescription>
        </DrawerHeader>

        <div className="overflow-y-auto px-4 pb-4 space-y-4">
          {/* Order Information */}
          <Card>
            <CardHeader>
              <CardTitle>Order Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Customer
                  </p>
                  <p className="text-sm">
                    {order.customer?.full_name || order.customer?.email || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    Laundry
                  </p>
                  <p className="text-sm">{order.laundry?.business_name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Truck className="h-4 w-4" />
                    Driver
                  </p>
                  <p className="text-sm">
                    {order.driver?.profile?.full_name ||
                      order.driver?.profile?.email ||
                      'Not assigned'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Weight
                  </p>
                  <p className="text-sm">{order.total_weight_kg} kg</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Created
                  </p>
                  <p className="text-sm">{format(new Date(order.created_at), 'PPpp')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pricing (same model as customer review) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Pricing
              </CardTitle>
              <CardDescription>
                Laundry fee, platform fee, commission, driver delivery for both legs. Total platform earnings = platform fee + commission.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Laundry fee (laundry share)</span>
                <span>R{Number(order.service_fee ?? 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Commission (from service)</span>
                <span>R{Number(order.commission_amount ?? 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Platform fee</span>
                <span>R{Number(order.platform_fee ?? 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Driver delivery fee (pickup leg)</span>
                <span>R{((Number(order.pickup_fee ?? 0)) / 2).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Driver delivery fee (return leg)</span>
                <span>R{((Number(order.pickup_fee ?? 0)) / 2).toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t font-semibold">
                <span>Total (customer paid)</span>
                <span>R{Number(order.total_price ?? 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t text-primary font-semibold">
                <span>Platform earnings</span>
                <span>R{(Number(order.platform_fee ?? 0) + Number(order.commission_amount ?? 0)).toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Order Items (display only, no prices) */}
          {orderDetails?.order_items && orderDetails.order_items.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Order Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {orderDetails.order_items.map((item: { id: string; service_type: string; quantity: number; description?: string | null }) => (
                    <div key={item.id} className="flex justify-between items-start p-2 rounded border text-sm">
                      <span className="font-medium capitalize">{item.service_type.replace(/_/g, ' ')}</span>
                      <span className="text-muted-foreground">{item.quantity} kg</span>
                    </div>
                  ))}
                  <div className="flex justify-between pt-2 border-t font-semibold text-sm">
                    <span>Total Weight</span>
                    <span>{order.total_weight_kg} kg</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Addresses */}
          <Card>
            <CardHeader>
              <CardTitle>Addresses</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-2">
                  <MapPin className="h-4 w-4" />
                  Pickup Address
                </p>
                <p className="text-sm">{order.pickup_address}</p>
                <a
                  href={pickupMapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline mt-1 inline-block"
                >
                  View on Map →
                </a>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-2">
                  <MapPin className="h-4 w-4" />
                  Dropoff Address
                </p>
                <p className="text-sm">{order.dropoff_address}</p>
                <a
                  href={dropoffMapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline mt-1 inline-block"
                >
                  View on Map →
                </a>
              </div>
              {driverLocationUrl && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-2">
                    <Truck className="h-4 w-4" />
                    Driver Live Location
                  </p>
                  <a
                    href={driverLocationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Track Driver on Map →
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Status Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {statusHistory.map((entry, index) => (
                  <div key={entry.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      {index < statusHistory.length - 1 && (
                        <div className="w-0.5 h-full bg-gray-200 mt-1" />
                      )}
                    </div>
                    <div className="flex-1 pb-3">
                      <div className="flex items-center gap-2">
                        <Badge
                          className={
                            STATUS_COLORS[entry.to_status as OrderStatus] ||
                            'bg-gray-100 text-gray-800'
                          }
                        >
                          {entry.to_status.replace(/_/g, ' ')}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(entry.performed_at), 'PPpp')}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {entry.performed_by_role || 'system'} •{' '}
                        {entry.profiles?.full_name || entry.profiles?.email || 'System'}
                      </p>
                      {entry.metadata && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {JSON.stringify(entry.metadata)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Deliveries with Photos, OTPs, Signatures */}
          {deliveries.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Deliveries</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {deliveries.map((delivery) => (
                  <div key={delivery.id} className="border rounded p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Badge variant="outline" className="capitalize">
                          {delivery.type}
                        </Badge>
                        <Badge className="ml-2">{delivery.status}</Badge>
                      </div>
                      {delivery.drivers && (
                        <p className="text-sm text-muted-foreground">
                          Driver:{' '}
                          {delivery.drivers.profiles?.full_name ||
                            delivery.drivers.profiles?.email ||
                            'N/A'}
                        </p>
                      )}
                    </div>

                    {/* OTP */}
                    {delivery.otp_code && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">OTP Code</p>
                        <p className="text-sm font-mono">{delivery.otp_code}</p>
                        {delivery.otp_expires_at && (
                          <p className="text-xs text-muted-foreground">
                            Expires: {format(new Date(delivery.otp_expires_at), 'PPpp')}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Photos */}
                    {(delivery.pickup_photo_urls?.length > 0 ||
                      delivery.handover_photo_url ||
                      delivery.return_photo_url ||
                      delivery.delivery_photo_urls?.length > 0) && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-2">
                          <ImageIcon className="h-4 w-4" />
                          Photos
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {delivery.pickup_photo_urls?.map((url: string, idx: number) => (
                            <img
                              key={idx}
                              src={url}
                              alt={`Pickup photo ${idx + 1}`}
                              className="w-full h-32 object-cover rounded"
                            />
                          ))}
                          {delivery.handover_photo_url && (
                            <img
                              src={delivery.handover_photo_url}
                              alt="Handover photo"
                              className="w-full h-32 object-cover rounded"
                            />
                          )}
                          {delivery.return_photo_url && (
                            <img
                              src={delivery.return_photo_url}
                              alt="Return photo"
                              className="w-full h-32 object-cover rounded"
                            />
                          )}
                          {delivery.delivery_photo_urls?.map((url: string, idx: number) => (
                            <img
                              key={idx}
                              src={url}
                              alt={`Delivery photo ${idx + 1}`}
                              className="w-full h-32 object-cover rounded"
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Signature */}
                    {delivery.signature_data && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-2">
                          <FileText className="h-4 w-4" />
                          Signature
                        </p>
                        {delivery.signature_data.signature && (
                          <img
                            src={delivery.signature_data.signature}
                            alt="Signature"
                            className="w-full h-32 object-contain border rounded bg-white"
                          />
                        )}
                        {delivery.signature_data.signed_at && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Signed: {format(new Date(delivery.signature_data.signed_at), 'PPpp')}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Notes */}
                    {delivery.note && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Notes</p>
                        <p className="text-sm">{delivery.note}</p>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Manual Intervention */}
          <Card>
            <CardHeader>
              <CardTitle>Manual Intervention</CardTitle>
              <CardDescription>
                Manually update order status or assign a new driver. All changes are recorded for audit purposes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Force Status Change</Label>
                <Select value={newStatus} onValueChange={(value) => setNewStatus(value as OrderStatus)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select new status" />
                  </SelectTrigger>
                  <SelectContent>
                    {ORDER_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status.replace(/_/g, ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Reason for status change (required)"
                  value={statusChangeReason}
                  onChange={(e) => setStatusChangeReason(e.target.value)}
                />
                <Button
                  onClick={handleForceStatusChange}
                  disabled={loading || !newStatus || !statusChangeReason.trim()}
                  variant="outline"
                >
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Force Status Change
                </Button>
              </div>
              <div className="space-y-2">
                <Label>Re-dispatch Driver</Label>
                <p className="text-xs text-muted-foreground">
                  {redispatchTaskType === 'pickup' && 'Requests a driver for the pickup leg (customer → laundry).'}
                  {redispatchTaskType === 'delivery' && 'Requests a driver for the return leg (laundry → customer).'}
                  {redispatchTaskType === null && 'Current status does not allow re-dispatch.'}
                </p>
                <Button
                  onClick={handleRedispatchDriver}
                  disabled={loading || redispatchTaskType === null}
                  variant="outline"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Re-dispatch Driver ({redispatchTaskType ?? '—'})
                </Button>
              </div>
              {!['cancelled', 'completed', 'disputed'].includes(order.status) && (
                <div className="space-y-2 pt-4 border-t">
                  <Label>Cancel Order</Label>
                  <Button
                    onClick={handleCancelOrder}
                    disabled={loading}
                    variant="destructive"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Cancel Order
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
