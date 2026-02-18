-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'ZAR',
  payment_method TEXT NOT NULL CHECK (payment_method IN ('paystack', 'yoco', 'payfast')),
  payment_provider_transaction_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded', 'partially_refunded')),
  escrow_status TEXT NOT NULL DEFAULT 'held' CHECK (escrow_status IN ('held', 'released', 'refunded')),
  commission_amount NUMERIC(10, 2) DEFAULT 0.00 CHECK (commission_amount >= 0),
  platform_fee NUMERIC(10, 2) DEFAULT 0.00 CHECK (platform_fee >= 0),
  laundry_payout_amount NUMERIC(10, 2) DEFAULT 0.00 CHECK (laundry_payout_amount >= 0),
  driver_payout_amount NUMERIC(10, 2) DEFAULT 0.00 CHECK (driver_payout_amount >= 0),
  refund_amount NUMERIC(10, 2) DEFAULT 0.00 CHECK (refund_amount >= 0),
  refund_reason TEXT,
  webhook_payload JSONB,
  webhook_processed_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  released_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create payouts table
CREATE TABLE IF NOT EXISTS payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('laundry', 'driver')),
  recipient_id UUID NOT NULL,
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  delivery_id UUID REFERENCES deliveries(id) ON DELETE SET NULL,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'ZAR',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  period_start DATE,
  period_end DATE,
  bank_account_details JSONB,
  payout_provider_transaction_id TEXT,
  processed_at TIMESTAMPTZ,
  failure_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status, escrow_status);
CREATE INDEX IF NOT EXISTS idx_payments_provider_txn ON payments(payment_provider_transaction_id);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payouts_recipient ON payouts(recipient_type, recipient_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON payouts(status);
CREATE INDEX IF NOT EXISTS idx_payouts_period ON payouts(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_payouts_recipient_status ON payouts(recipient_type, recipient_id, status);

-- Enable RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for payments
CREATE POLICY "customers_see_own_payments"
  ON payments FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid());

CREATE POLICY "laundries_see_order_payments"
  ON payments FOR SELECT
  TO authenticated
  USING (
    order_id IN (
      SELECT id FROM orders 
      WHERE laundry_id IN (
        SELECT id FROM laundries WHERE owner_user_id = auth.uid()
      )
    )
  );

CREATE POLICY "admins_see_all_payments"
  ON payments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create RLS policies for payouts
CREATE POLICY "laundries_see_own_payouts"
  ON payouts FOR SELECT
  TO authenticated
  USING (
    recipient_type = 'laundry'
    AND recipient_id IN (
      SELECT id FROM laundries WHERE owner_user_id = auth.uid()
    )
  );

CREATE POLICY "drivers_see_own_payouts"
  ON payouts FOR SELECT
  TO authenticated
  USING (
    recipient_type = 'driver'
    AND recipient_id IN (
      SELECT id FROM drivers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "admins_see_all_payouts"
  ON payouts FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create updated_at triggers
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payouts_updated_at
  BEFORE UPDATE ON payouts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
