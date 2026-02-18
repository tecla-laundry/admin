-- Create admin_audit_logs table
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  performed_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('laundry', 'order', 'driver', 'payout', 'dispute', 'admin', 'settings')),
  target_id UUID,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create admin_invites table
CREATE TABLE IF NOT EXISTS admin_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  invited_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role = 'admin'),
  expires_at TIMESTAMPTZ NOT NULL,
  claimed_at TIMESTAMPTZ,
  claimed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_performed_by ON admin_audit_logs(performed_by);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_target ON admin_audit_logs(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action ON admin_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON admin_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_performer_time ON admin_audit_logs(performed_by, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_invites_token ON admin_invites(token);
CREATE INDEX IF NOT EXISTS idx_admin_invites_email ON admin_invites(email);
CREATE INDEX IF NOT EXISTS idx_admin_invites_active_expires ON admin_invites(is_active, expires_at) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_admin_invites_invited_by ON admin_invites(invited_by);

-- Enable RLS
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_invites ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for admin_audit_logs
CREATE POLICY "admins_see_all_audit_logs"
  ON admin_audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create RLS policies for admin_invites
CREATE POLICY "admins_manage_invites"
  ON admin_invites FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "public_read_invite_by_token"
  ON admin_invites FOR SELECT
  TO anon, authenticated
  USING (
    is_active = true
    AND expires_at > now()
    AND claimed_at IS NULL
  );

-- Create function to auto-expire invites
CREATE OR REPLACE FUNCTION expire_admin_invites()
RETURNS void AS $$
BEGIN
  UPDATE admin_invites
  SET is_active = false
  WHERE is_active = true
    AND expires_at < now()
    AND claimed_at IS NULL;
END;
$$ LANGUAGE plpgsql;
