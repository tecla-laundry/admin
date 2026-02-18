-- Create capacity_logs table
CREATE TABLE IF NOT EXISTS capacity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laundry_id UUID NOT NULL REFERENCES laundries(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_capacity_kg INTEGER NOT NULL CHECK (total_capacity_kg > 0),
  used_capacity_kg INTEGER NOT NULL DEFAULT 0 CHECK (used_capacity_kg >= 0),
  remaining_capacity_kg INTEGER NOT NULL CHECK (remaining_capacity_kg >= 0),
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('deduct', 'reset', 'adjust')),
  amount_kg NUMERIC(5, 2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_capacity_logs_laundry_date ON capacity_logs(laundry_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_capacity_logs_order ON capacity_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_capacity_logs_laundry_date_action ON capacity_logs(laundry_id, date, action);

-- Enable RLS
ALTER TABLE capacity_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "laundries_see_own_capacity_logs"
  ON capacity_logs FOR SELECT
  TO authenticated
  USING (
    laundry_id IN (
      SELECT id FROM laundries WHERE owner_user_id = auth.uid()
    )
  );

CREATE POLICY "admins_see_all_capacity_logs"
  ON capacity_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create function to get current day's capacity
CREATE OR REPLACE FUNCTION get_laundry_capacity_today(laundry_uuid UUID)
RETURNS TABLE (
  total_capacity_kg INTEGER,
  used_capacity_kg INTEGER,
  remaining_capacity_kg INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cl.total_capacity_kg,
    cl.used_capacity_kg,
    cl.remaining_capacity_kg
  FROM capacity_logs cl
  WHERE cl.laundry_id = laundry_uuid
    AND cl.date = CURRENT_DATE
    AND cl.action = 'reset'
  ORDER BY cl.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;
