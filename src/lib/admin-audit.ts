'use client'

/**
 * The repo has historically used two different `admin_audit_logs` schemas:
 * - Current migrations: performed_by / target_type / target_id
 * - Older client code: admin_id / resource_type / resource_id
 *
 * This helper writes audit logs in a backwards-compatible way by attempting the
 * migrated schema first, then falling back to the legacy one.
 */
export async function logAdminAudit(
  supabase: any,
  input: {
    action: string
    targetType: string
    targetId?: string | null
    details?: any
  }
) {
  const { data: auth } = await supabase.auth.getUser()
  const userId: string | undefined = auth?.user?.id
  if (!userId) return

  const primaryPayload = {
    performed_by: userId,
    action: input.action,
    target_type: input.targetType,
    target_id: input.targetId ?? null,
    details: input.details ?? null,
  }

  const legacyPayload = {
    admin_id: userId,
    action: input.action,
    resource_type: input.targetType,
    resource_id: input.targetId ?? null,
    details: input.details ?? null,
  }

  const primary = await supabase.from('admin_audit_logs').insert(primaryPayload)
  if (!primary?.error) return

  // Fallback to legacy schema if the primary schema fails (e.g. missing columns).
  await supabase.from('admin_audit_logs').insert(legacyPayload)
}

