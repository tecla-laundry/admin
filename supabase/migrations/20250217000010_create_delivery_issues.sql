-- Create delivery_issues table
CREATE TABLE IF NOT EXISTS delivery_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id UUID NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  reported_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  reported_by_role TEXT NOT NULL CHECK (reported_by_role IN ('customer', 'laundry_owner', 'driver')),
  reason TEXT NOT NULL CHECK (reason IN ('damaged_bag', 'wrong_address', 'customer_not_home', 'missing_items', 'late_delivery', 'other')),
  description TEXT NOT NULL,
  photo_urls TEXT[],
  details JSONB,
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'dismissed')),
  resolved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_delivery_issues_delivery ON delivery_issues(delivery_id);
CREATE INDEX IF NOT EXISTS idx_delivery_issues_order ON delivery_issues(order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_issues_reported_by ON delivery_issues(reported_by);
CREATE INDEX IF NOT EXISTS idx_delivery_issues_status_severity ON delivery_issues(status, severity, created_at DESC);

-- Enable RLS
ALTER TABLE delivery_issues ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "users_see_own_issues"
  ON delivery_issues FOR SELECT
  TO authenticated
  USING (reported_by = auth.uid());

CREATE POLICY "parties_see_order_issues"
  ON delivery_issues FOR SELECT
  TO authenticated
  USING (
    order_id IN (
      SELECT id FROM orders 
      WHERE customer_id = auth.uid()
      OR laundry_id IN (
        SELECT id FROM laundries WHERE owner_user_id = auth.uid()
      )
    )
    OR delivery_id IN (
      SELECT id FROM deliveries 
      WHERE driver_id IN (
        SELECT id FROM drivers WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "admins_manage_all_issues"
  ON delivery_issues FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create updated_at trigger
CREATE TRIGGER update_delivery_issues_updated_at
  BEFORE UPDATE ON delivery_issues
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create trigger to set order to disputed on critical issue
CREATE OR REPLACE FUNCTION check_critical_issue()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.severity = 'critical' AND NEW.status = 'open' THEN
    UPDATE orders
    SET status = 'disputed'
    WHERE id = NEW.order_id
    AND status != 'disputed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_critical_issue_trigger
  AFTER INSERT OR UPDATE ON delivery_issues
  FOR EACH ROW
  EXECUTE FUNCTION check_critical_issue();
