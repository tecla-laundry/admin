'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useQuery } from '@tanstack/react-query'
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'

import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { logAdminAudit } from '@/lib/admin-audit'

type AdminProfile = {
  id: string
  email: string | null
  full_name: string | null
  role: string
  created_at?: string | null
}

async function fetchAdmins(
  supabase: ReturnType<typeof import('@/lib/supabase/client').createClient>
): Promise<AdminProfile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id,email,full_name,role,created_at')
    .eq('role', 'admin')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []) as AdminProfile[]
}

export function AdminsTable() {
  const { supabase } = useAuth()
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [revokeTarget, setRevokeTarget] = useState<AdminProfile | null>(null)
  const [revoking, setRevoking] = useState(false)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admins'],
    queryFn: () => fetchAdmins(supabase),
  })

  const columns = useMemo<ColumnDef<AdminProfile>[]>(() => {
    return [
      {
        accessorKey: 'full_name',
        header: 'Name',
        cell: ({ row }) => (
          <div className="font-medium">
            {row.original.full_name || row.original.email || 'N/A'}
          </div>
        ),
      },
      {
        accessorKey: 'email',
        header: 'Email',
        cell: ({ row }) => row.original.email || 'N/A',
      },
      {
        accessorKey: 'role',
        header: 'Role',
        cell: () => <Badge variant="default">Admin</Badge>,
      },
      {
        accessorKey: 'created_at',
        header: 'Created',
        cell: ({ row }) => {
          const v = row.original.created_at
          if (!v) return '—'
          const d = new Date(v)
          if (Number.isNaN(d.getTime())) return '—'
          return d.toLocaleDateString()
        },
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setRevokeTarget(row.original)}
          >
            Revoke
          </Button>
        ),
      },
    ]
  }, [])

  const table = useReactTable({
    data: data || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    state: { sorting, columnFilters },
  })

  const confirmRevoke = async () => {
    if (!revokeTarget) return
    setRevoking(true)
    try {
      const { data: auth } = await supabase.auth.getUser()
      const currentUserId = auth?.user?.id

      if (currentUserId && revokeTarget.id === currentUserId) {
        toast.error('You cannot revoke your own admin access')
        return
      }

      // Revoke admin access by downgrading role back to customer.
      const { error } = await supabase
        .from('profiles')
        .update({ role: 'customer' })
        .eq('id', revokeTarget.id)

      if (error) throw error

      // Audit log (best-effort)
      if (currentUserId) {
        try {
          await logAdminAudit(supabase, {
            action: 'revoke_admin',
            targetType: 'admin',
            targetId: revokeTarget.id,
            details: { email: revokeTarget.email, old_role: 'admin', new_role: 'customer' },
          })
        } catch {}
      }

      toast.success('Admin access revoked')
      setRevokeTarget(null)
      refetch()
    } catch (e: any) {
      toast.error(e?.message || 'Failed to revoke admin access')
    } finally {
      setRevoking(false)
    }
  }

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading admins…</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Input
          placeholder="Search by name or email..."
          value={(table.getColumn('full_name')?.getFilterValue() as string) ?? ''}
          onChange={(event) =>
            table.getColumn('full_name')?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
        <Button variant="outline" onClick={() => refetch()}>
          Refresh
        </Button>
      </div>

      <div className="rounded-md border">
        <table className="w-full">
          <thead className="border-b bg-muted/50">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="text-left p-3 text-sm font-medium">
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="border-b last:border-b-0">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="p-3 text-sm">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td className="p-6 text-center text-sm text-muted-foreground" colSpan={columns.length}>
                  No admins found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-end space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
        </Button>
      </div>

      <Dialog open={!!revokeTarget} onOpenChange={(o) => !o && setRevokeTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke admin access</DialogTitle>
            <DialogDescription>
              This will downgrade the user’s role to <code className="font-mono">customer</code> and immediately block access to the admin dashboard.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 text-sm">
            <div><span className="text-muted-foreground">User:</span> {revokeTarget?.full_name || '—'}</div>
            <div><span className="text-muted-foreground">Email:</span> {revokeTarget?.email || '—'}</div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setRevokeTarget(null)} disabled={revoking}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmRevoke} disabled={revoking}>
              {revoking ? 'Revoking…' : 'Revoke'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

