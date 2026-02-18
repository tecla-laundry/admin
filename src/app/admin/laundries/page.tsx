'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LaundryTable } from '@/components/admin/laundry-table'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/auth-context'

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

async function fetchLaundries(status: string, supabase: ReturnType<typeof import('@/lib/supabase/client').createClient>): Promise<Laundry[]> {
  const { data, error } = await supabase
    .from('laundries')
    .select('*')
    .eq('status', status)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export default function LaundriesPage() {
  const [activeTab, setActiveTab] = useState('pending')
  const [refreshKey, setRefreshKey] = useState(0)
  const { supabase } = useAuth()

  const statusMap: Record<string, string> = {
    pending: 'pending_approval',
    active: 'active',
    rejected: 'rejected',
    'more-info': 'more_info_needed',
  }

  const { data: pendingData, isLoading: pendingLoading } = useQuery({
    queryKey: ['laundries', 'pending_approval', refreshKey],
    queryFn: () => fetchLaundries('pending_approval', supabase),
  })

  const { data: activeData, isLoading: activeLoading } = useQuery({
    queryKey: ['laundries', 'active', refreshKey],
    queryFn: () => fetchLaundries('active', supabase),
  })

  const { data: rejectedData, isLoading: rejectedLoading } = useQuery({
    queryKey: ['laundries', 'rejected', refreshKey],
    queryFn: () => fetchLaundries('rejected', supabase),
  })

  const { data: moreInfoData, isLoading: moreInfoLoading } = useQuery({
    queryKey: ['laundries', 'more_info_needed', refreshKey],
    queryFn: () => fetchLaundries('more_info_needed', supabase),
  })

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Laundry Partners</h1>
          <p className="text-muted-foreground">
            Manage laundry partner applications and approvals
          </p>
        </div>
        <Button onClick={handleRefresh} variant="outline">
          Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">
            Pending Approval ({pendingData?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="active">Active ({activeData?.length || 0})</TabsTrigger>
          <TabsTrigger value="rejected">Rejected ({rejectedData?.length || 0})</TabsTrigger>
          <TabsTrigger value="more-info">
            More Info Needed ({moreInfoData?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pending Approvals</CardTitle>
              <CardDescription>
                Laundry applications awaiting review. Click &apos;View Details&apos; to approve or reject.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : (
                <LaundryTable data={pendingData || []} onRefresh={handleRefresh} />
              )}
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
              {activeLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : (
                <LaundryTable data={activeData || []} onRefresh={handleRefresh} />
              )}
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
              {rejectedLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : (
                <LaundryTable data={rejectedData || []} onRefresh={handleRefresh} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="more-info" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>More Info Needed</CardTitle>
              <CardDescription>
                Applications requiring additional information
              </CardDescription>
            </CardHeader>
            <CardContent>
              {moreInfoLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : (
                <LaundryTable data={moreInfoData || []} onRefresh={handleRefresh} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
