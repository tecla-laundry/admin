'use client'

import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/contexts/auth-context'
import { logAdminAudit } from '@/lib/admin-audit'
import { useEdgeFunction } from '@/hooks/use-edge-function'

const inviteSchema = z.object({
  email: z.string().email('Enter a valid email address'),
})

type InviteFormValues = z.infer<typeof inviteSchema>

/**
 * Invites a new admin user by sending an invitation email.
 * The system validates permissions before sending the invite.
 */
export function AdminInviteDialog() {
  const { supabase } = useAuth()
  const { invoke } = useEdgeFunction()
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: '' },
    mode: 'onSubmit',
  })

  const onSubmit = async (values: InviteFormValues) => {
    setSubmitting(true)
    try {
      const { data, error } = await invoke('invite_admin', {
        body: { email: values.email, role: 'admin' },
      })

      if (error) throw error

      // Best-effort audit log (schema differs across environments)
      try {
        await logAdminAudit(supabase, {
          action: 'invite_admin',
          targetType: 'admin',
          targetId: null,
          details: { invited_email: values.email, edge_response: data ?? null },
        })
      } catch {}

      toast.success('Invite sent')
      form.reset()
      setOpen(false)
    } catch (e: any) {
      toast.error(e?.message || 'Failed to send invite')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Invite Admin</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite new admin</DialogTitle>
          <DialogDescription>
            Send an invitation email to grant admin access to a new user
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              placeholder="admin@example.com"
              type="email"
              autoComplete="email"
              {...form.register('email')}
            />
            {form.formState.errors.email?.message ? (
              <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
            ) : null}
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Sending…' : 'Send invite'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

