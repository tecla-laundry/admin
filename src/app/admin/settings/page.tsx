'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/contexts/auth-context'
import { logAdminAudit } from '@/lib/admin-audit'
import { MapPin, Clock, Banknote } from 'lucide-react'
import predefinedCoverageAreas from '@/lib/coverageAreas.json'

type CoverageArea = { name: string; center: { lat: number; lng: number }; radius: number }

type PlatformSetting = {
  key: string
  value: any
  description?: string | null
  updated_at?: string | null
}

async function getPlatformSetting(
  supabase: ReturnType<typeof import('@/lib/supabase/client').createClient>,
  key: string
): Promise<PlatformSetting | null> {
  const { data, error } = await supabase
    .from('platform_settings')
    .select('key,value,description,updated_at')
    .eq('key', key)
    .single()

  if (error) return null
  return data as PlatformSetting
}

async function upsertPlatformSetting(
  supabase: ReturnType<typeof import('@/lib/supabase/client').createClient>,
  key: string,
  value: any,
  description?: string
) {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { error } = await supabase
    .from('platform_settings')
    .upsert(
      {
        key,
        value,
        description,
        updated_by: user?.id || null,
      },
      { onConflict: 'key' }
    )
  if (error) throw error
}

export default function SettingsPage() {
  const { supabase } = useAuth()
  const queryClient = useQueryClient()

  // Coverage Areas: selected area names (from predefined list)
  const [defaultRadius, setDefaultRadius] = useState('15')
  const [selectedCoverageNames, setSelectedCoverageNames] = useState<Set<string>>(new Set())

  // Dispatch Settings
  const [dispatchTimeout, setDispatchTimeout] = useState('180')
  const [maxDriverDistance, setMaxDriverDistance] = useState('12')
  const [driverMatchingRadius, setDriverMatchingRadius] = useState('10')

  // Pricing (commission %, platform fee R, delivery R/km)
  const [commissionRateDefault, setCommissionRateDefault] = useState('0.15')
  const [platformFeeDefault, setPlatformFeeDefault] = useState('15')
  const [deliveryFeePerKm, setDeliveryFeePerKm] = useState('7')

  const [saving, setSaving] = useState<string | null>(null)

  // Load coverage settings
  useQuery({
    queryKey: ['settings', 'coverage'],
    queryFn: async () => {
      const radius = await getPlatformSetting(supabase, 'coverage_default_radius_km')
      const areas = await getPlatformSetting(supabase, 'coverage_areas')
      if (radius?.value) setDefaultRadius(String(radius.value))
      if (areas?.value && Array.isArray(areas.value)) {
        const names = (areas.value as CoverageArea[]).map((a) => a.name)
        setSelectedCoverageNames(new Set(names))
      }
      return { radius, areas }
    },
  })

  // Load dispatch settings
  useQuery({
    queryKey: ['settings', 'dispatch'],
    queryFn: async () => {
      const timeout = await getPlatformSetting(supabase, 'dispatch_timeout_seconds')
      const maxDistance = await getPlatformSetting(supabase, 'dispatch_max_driver_distance_km')
      const matchingRadius = await getPlatformSetting(supabase, 'dispatch_matching_radius_km')
      if (timeout?.value) setDispatchTimeout(String(timeout.value))
      if (maxDistance?.value) setMaxDriverDistance(String(maxDistance.value))
      if (matchingRadius?.value) setDriverMatchingRadius(String(matchingRadius.value))
      return { timeout, maxDistance, matchingRadius }
    },
  })

  // Load pricing settings
  useQuery({
    queryKey: ['settings', 'pricing'],
    queryFn: async () => {
      const [commission, platformFee, deliveryPerKm] = await Promise.all([
        getPlatformSetting(supabase, 'commission_rate_default'),
        getPlatformSetting(supabase, 'platform_fee_default'),
        getPlatformSetting(supabase, 'delivery_fee_per_km'),
      ])
      if (commission?.value != null) setCommissionRateDefault(String(commission.value))
      if (platformFee?.value != null) setPlatformFeeDefault(String(platformFee.value))
      if (deliveryPerKm?.value != null) setDeliveryFeePerKm(String(deliveryPerKm.value))
      return { commission, platformFee, deliveryPerKm }
    },
  })

  const saveMutation = useMutation({
    mutationFn: async ({
      category,
      data,
    }: {
      category: string
      data: Record<string, any>
    }) => {
      for (const [key, value] of Object.entries(data)) {
        await upsertPlatformSetting(supabase, key, value)
      }
      await logAdminAudit(supabase, {
        action: 'update_platform_settings',
        targetType: 'settings',
        targetId: null,
        details: { category, settings: Object.keys(data) },
      })
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['settings', variables.category] })
      toast.success('Settings saved successfully')
      setSaving(null)
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save settings')
      setSaving(null)
    },
  })

  const handleSaveCoverage = () => {
    setSaving('coverage')
    const areasValue: CoverageArea[] = predefinedCoverageAreas.filter((a) =>
      selectedCoverageNames.has(a.name)
    )
    saveMutation.mutate({
      category: 'coverage',
      data: {
        coverage_default_radius_km: Number(defaultRadius),
        coverage_areas: areasValue.length ? areasValue : null,
      },
    })
  }

  const toggleCoverageArea = (name: string) => {
    setSelectedCoverageNames((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const selectAllCoverage = () => {
    setSelectedCoverageNames(new Set(predefinedCoverageAreas.map((a) => a.name)))
  }

  const deselectAllCoverage = () => {
    setSelectedCoverageNames(new Set())
  }

  const predefinedList = useMemo(() => predefinedCoverageAreas as CoverageArea[], [])

  const handleSaveDispatch = () => {
    setSaving('dispatch')
    saveMutation.mutate({
      category: 'dispatch',
      data: {
        dispatch_timeout_seconds: Number(dispatchTimeout),
        dispatch_max_driver_distance_km: Number(maxDriverDistance),
        dispatch_matching_radius_km: Number(driverMatchingRadius),
      },
    })
  }

  const handleSavePricing = () => {
    const rate = Number(commissionRateDefault)
    const fee = Number(platformFeeDefault)
    const perKm = Number(deliveryFeePerKm)
    if (!Number.isFinite(rate) || rate < 0 || rate > 1) {
      toast.error('Commission rate must be between 0 and 1 (e.g. 0.15 for 15%)')
      return
    }
    if (!Number.isFinite(fee) || fee < 0 || !Number.isFinite(perKm) || perKm < 0) {
      toast.error('Platform fee and delivery fee per km must be non-negative numbers')
      return
    }
    setSaving('pricing')
    saveMutation.mutate({
      category: 'pricing',
      data: {
        commission_rate_default: rate,
        platform_fee_default: fee,
        delivery_fee_per_km: perKm,
      },
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Platform Settings</h1>
        <p className="text-muted-foreground">
          Configure platform-wide settings
        </p>
      </div>

      <Tabs defaultValue="coverage" className="space-y-4">
        <TabsList>
          <TabsTrigger value="coverage">Coverage Areas</TabsTrigger>
          <TabsTrigger value="dispatch">Dispatch Settings</TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
        </TabsList>

        <TabsContent value="coverage" className="space-y-4">
      <Card>
        <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Coverage Areas
              </CardTitle>
          <CardDescription>
                Configure service coverage areas and default radius for driver matching
          </CardDescription>
        </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="default-radius">Default Radius (km)</Label>
                <Input
                  id="default-radius"
                  type="number"
                  min="1"
                  max="50"
                  value={defaultRadius}
                  onChange={(e) => setDefaultRadius(e.target.value)}
                  placeholder="15"
                />
                <p className="text-xs text-muted-foreground">
                  Default search radius for finding nearby drivers and laundries
                </p>
              </div>

              <div className="space-y-2">
                <Label>Coverage Areas</Label>
                <p className="text-xs text-muted-foreground">
                  Select which areas are in scope. Default radius above applies where no area-specific radius is set.
                </p>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={selectAllCoverage}>
                    Select all
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={deselectAllCoverage}>
                    Deselect all
                  </Button>
                </div>
                <div className="border rounded-md p-3 max-h-[280px] overflow-y-auto space-y-2">
                  {predefinedList.map((area) => (
                    <label
                      key={area.name}
                      className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded px-2 py-1"
                    >
                      <input
                        type="checkbox"
                        checked={selectedCoverageNames.has(area.name)}
                        onChange={() => toggleCoverageArea(area.name)}
                        className="rounded border-input"
                      />
                      <span className="text-sm">
                        {area.name}
                        <span className="text-muted-foreground ml-1">({area.radius} km)</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleSaveCoverage}
                disabled={saving === 'coverage'}
              >
                {saving === 'coverage' ? 'Saving...' : 'Save Coverage Settings'}
              </Button>
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="dispatch" className="space-y-4">
      <Card>
        <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Dispatch Settings
              </CardTitle>
          <CardDescription>
            Configure dispatch timeouts and driver matching parameters
          </CardDescription>
        </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="dispatch-timeout">Dispatch Timeout (seconds)</Label>
                <Input
                  id="dispatch-timeout"
                  type="number"
                  min="60"
                  max="600"
                  value={dispatchTimeout}
                  onChange={(e) => setDispatchTimeout(e.target.value)}
                  placeholder="180"
                />
                <p className="text-xs text-muted-foreground">
                  Maximum time to wait for a driver to accept a delivery request before re-dispatching
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="max-driver-distance">Maximum Driver Distance (km)</Label>
                <Input
                  id="max-driver-distance"
                  type="number"
                  min="1"
                  max="50"
                  value={maxDriverDistance}
                  onChange={(e) => setMaxDriverDistance(e.target.value)}
                  placeholder="12"
                />
                <p className="text-xs text-muted-foreground">
                  Maximum distance a driver can be from pickup/delivery location to be considered
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="matching-radius">Driver Matching Radius (km)</Label>
                <Input
                  id="matching-radius"
                  type="number"
                  min="1"
                  max="30"
                  value={driverMatchingRadius}
                  onChange={(e) => setDriverMatchingRadius(e.target.value)}
                  placeholder="10"
                />
                <p className="text-xs text-muted-foreground">
                  Initial search radius for finding available drivers (may expand if no drivers found)
                </p>
              </div>

              <Button
                onClick={handleSaveDispatch}
                disabled={saving === 'dispatch'}
              >
                {saving === 'dispatch' ? 'Saving...' : 'Save Dispatch Settings'}
              </Button>
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="pricing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Banknote className="h-5 w-5" />
                Pricing &amp; Fees
              </CardTitle>
              <CardDescription>
                Platform commission (from service fee), fixed platform fee, and delivery fee per km. Used when creating orders.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="commission-rate">Commission rate (0–1)</Label>
                <Input
                  id="commission-rate"
                  type="number"
                  min="0"
                  max="1"
                  step="0.01"
                  value={commissionRateDefault}
                  onChange={(e) => setCommissionRateDefault(e.target.value)}
                  placeholder="0.15"
                />
                <p className="text-xs text-muted-foreground">
                  Platform commission as decimal (e.g. 0.15 = 15%). Taken from the laundry service fee. Default 15%.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="platform-fee">Platform fee (ZAR)</Label>
                <Input
                  id="platform-fee"
                  type="number"
                  min="0"
                  value={platformFeeDefault}
                  onChange={(e) => setPlatformFeeDefault(e.target.value)}
                  placeholder="15"
                />
                <p className="text-xs text-muted-foreground">
                  Fixed fee paid to the platform per order (unchanging).
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="delivery-fee-per-km">Delivery fee per km (ZAR)</Label>
                <Input
                  id="delivery-fee-per-km"
                  type="number"
                  min="0"
                  value={deliveryFeePerKm}
                  onChange={(e) => setDeliveryFeePerKm(e.target.value)}
                  placeholder="7"
                />
                <p className="text-xs text-muted-foreground">
                  Total delivery fee = this × (customer–laundry distance km) × 2 (pickup + return). Each driver gets half.
                </p>
              </div>
              <Button
                onClick={handleSavePricing}
                disabled={saving === 'pricing'}
              >
                {saving === 'pricing' ? 'Saving...' : 'Save Pricing'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
