-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  laundry_id UUID NOT NULL REFERENCES laundries(id) ON DELETE RESTRICT,
  status TEXT NOT NULL CHECK (status IN (
    'pending', 'laundry_requested', 'accepted', 'rejected',
    'driver_pickup_assigned', 'pickup_in_progress', 'picked_up',
    'at_laundry', 'washing_in_progress', 'ready_for_delivery',
    'driver_delivery_assigned', 'delivery_in_progress',
    'completed', 'cancelled', 'disputed'
  )),
  total_price NUMERIC(10, 2) NOT NULL CHECK (total_price >= 0),
  service_fee NUMERIC(10, 2) DEFAULT 0.00 CHECK (service_fee >= 0),
  pickup_fee NUMERIC(10, 2) DEFAULT 0.00 CHECK (pickup_fee >= 0),
  commission_amount NUMERIC(10, 2) DEFAULT 0.00 CHECK (commission_amount >= 0),
  platform_fee NUMERIC(10, 2) DEFAULT 0.00 CHECK (platform_fee >= 0),
  pickup_address TEXT NOT NULL,
  pickup_latitude NUMERIC(10, 8) NOT NULL,
  pickup_longitude NUMERIC(11, 8) NOT NULL,
  dropoff_address TEXT NOT NULL,
  dropoff_latitude NUMERIC(10, 8) NOT NULL,
  dropoff_longitude NUMERIC(11, 8) NOT NULL,
  scheduled_pickup_time TIMESTAMPTZ NOT NULL,
  estimated_completion_time TIMESTAMPTZ,
  total_weight_kg NUMERIC(5, 2) NOT NULL CHECK (total_weight_kg > 0),
  special_notes TEXT,
  cancellation_reason TEXT,
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES profiles(id),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create order_items table
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL CHECK (service_type IN ('wash_and_fold', 'dry_clean', 'iron_only', 'express')),
  quantity NUMERIC(5, 2) NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
  total_price NUMERIC(10, 2) NOT NULL CHECK (total_price >= 0),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_laundry ON orders(laundry_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_laundry_status ON orders(laundry_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_customer_status ON orders(customer_id, status);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_service_type ON order_items(service_type);

-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for orders
CREATE POLICY "customers_see_own_orders"
  ON orders FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid());

CREATE POLICY "laundries_see_own_orders"
  ON orders FOR ALL
  TO authenticated
  USING (
    laundry_id IN (
      SELECT id FROM laundries WHERE owner_user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "admins_see_all_orders"
  ON orders FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create RLS policies for order_items
CREATE POLICY "order_items_follow_order_access"
  ON order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders WHERE id = order_items.order_id
      AND (
        customer_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM laundries 
          WHERE id = orders.laundry_id AND owner_user_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
        )
      )
    )
  );

-- Create updated_at trigger
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
