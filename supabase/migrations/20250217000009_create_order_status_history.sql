-- Create order_status_history table
CREATE TABLE IF NOT EXISTS order_status_history (
  id SERIAL PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  performed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  performed_by_role TEXT CHECK (performed_by_role IN ('customer', 'laundry_owner', 'admin', 'driver', 'system')),
  metadata JSONB,
  performed_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_order_status_history_order ON order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_order_status_history_performed_at ON order_status_history(performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_status_history_order_time ON order_status_history(order_id, performed_at DESC);

-- Enable RLS
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "users_see_own_order_history"
  ON order_status_history FOR SELECT
  TO authenticated
  USING (
    order_id IN (
      SELECT id FROM orders WHERE customer_id = auth.uid()
    )
  );

CREATE POLICY "laundries_see_order_history"
  ON order_status_history FOR SELECT
  TO authenticated
  USING (
    order_id IN (
      SELECT id FROM orders 
      WHERE laundry_id IN (
        SELECT id FROM laundries WHERE owner_user_id = auth.uid()
      )
    )
  );

CREATE POLICY "admins_see_all_history"
  ON order_status_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create function to log status change
CREATE OR REPLACE FUNCTION log_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO order_status_history (
      order_id,
      from_status,
      to_status,
      performed_by,
      performed_by_role,
      metadata
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      current_setting('app.current_user_id', true)::UUID,
      current_setting('app.current_user_role', true),
      current_setting('app.status_change_metadata', true)::JSONB
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: Trigger is commented out - can be enabled if needed
-- Status changes are primarily logged via Edge Functions
-- CREATE TRIGGER log_order_status_change_trigger
--   AFTER UPDATE ON orders
--   FOR EACH ROW
--   EXECUTE FUNCTION log_order_status_change();
