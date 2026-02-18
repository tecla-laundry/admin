-- Create deliveries table
CREATE TABLE IF NOT EXISTS deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('pickup', 'delivery')),
  status TEXT NOT NULL,
  pickup_photo_urls TEXT[],
  handover_photo_url TEXT,
  return_photo_url TEXT,
  delivery_photo_urls TEXT[],
  signature_data JSONB,
  otp_code TEXT,
  otp_expires_at TIMESTAMPTZ,
  note TEXT,
  estimated_arrival_time TIMESTAMPTZ,
  actual_pickup_time TIMESTAMPTZ,
  actual_delivery_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create delivery_requests table
CREATE TABLE IF NOT EXISTS delivery_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id UUID NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_deliveries_order ON deliveries(order_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_driver ON deliveries(driver_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_type_status ON deliveries(type, status);
CREATE INDEX IF NOT EXISTS idx_deliveries_driver_status ON deliveries(driver_id, status);
CREATE INDEX IF NOT EXISTS idx_deliveries_order_type ON deliveries(order_id, type);

CREATE INDEX IF NOT EXISTS idx_delivery_requests_delivery ON delivery_requests(delivery_id);
CREATE INDEX IF NOT EXISTS idx_delivery_requests_driver ON delivery_requests(driver_id);
CREATE INDEX IF NOT EXISTS idx_delivery_requests_status_expires ON delivery_requests(status, expires_at) WHERE status = 'pending';

-- Enable RLS
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_requests ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for deliveries
CREATE POLICY "drivers_see_assigned_deliveries"
  ON deliveries FOR SELECT
  TO authenticated
  USING (
    driver_id IN (
      SELECT id FROM drivers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "customers_see_order_deliveries"
  ON deliveries FOR SELECT
  TO authenticated
  USING (
    order_id IN (
      SELECT id FROM orders WHERE customer_id = auth.uid()
    )
  );

CREATE POLICY "laundries_see_order_deliveries"
  ON deliveries FOR SELECT
  TO authenticated
  USING (
    order_id IN (
      SELECT id FROM orders 
      WHERE laundry_id IN (
        SELECT id FROM laundries WHERE owner_user_id = auth.uid()
      )
    )
  );

CREATE POLICY "admins_see_all_deliveries"
  ON deliveries FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create RLS policies for delivery_requests
CREATE POLICY "drivers_see_own_requests"
  ON delivery_requests FOR SELECT
  TO authenticated
  USING (
    driver_id IN (
      SELECT id FROM drivers WHERE user_id = auth.uid()
    )
  );

-- Create updated_at trigger
CREATE TRIGGER update_deliveries_updated_at
  BEFORE UPDATE ON deliveries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to auto-expire delivery requests
CREATE OR REPLACE FUNCTION expire_delivery_requests()
RETURNS void AS $$
BEGIN
  UPDATE delivery_requests
  SET status = 'expired'
  WHERE status = 'pending' AND expires_at < now();
END;
$$ LANGUAGE plpgsql;
