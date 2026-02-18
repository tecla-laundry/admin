-- Create laundries table
CREATE TABLE IF NOT EXISTS laundries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  physical_address TEXT NOT NULL,
  latitude NUMERIC(10, 8) NOT NULL,
  longitude NUMERIC(11, 8) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending_approval', 'active', 'rejected', 'more_info_needed')),
  rejection_reason TEXT,
  services_offered JSONB NOT NULL,
  price_per_kg NUMERIC(10, 2) NOT NULL CHECK (price_per_kg > 0),
  capacity_per_day INTEGER NOT NULL CHECK (capacity_per_day > 0),
  operating_hours JSONB NOT NULL,
  bank_details JSONB,
  photos TEXT[],
  rating NUMERIC(3, 2) DEFAULT 0.00 CHECK (rating >= 0 AND rating <= 5.00),
  total_reviews INTEGER DEFAULT 0,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_laundries_status ON laundries(status);
CREATE INDEX IF NOT EXISTS idx_laundries_owner ON laundries(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_laundries_location ON laundries USING GIST (point(longitude, latitude));
CREATE INDEX IF NOT EXISTS idx_laundries_verified_rating ON laundries(is_verified, rating DESC);

-- Enable RLS
ALTER TABLE laundries ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "laundry_owners_manage_own_profile"
  ON laundries FOR ALL
  TO authenticated
  USING (
    owner_user_id = auth.uid()
    AND status IN ('pending_approval', 'active', 'more_info_needed')
  );

CREATE POLICY "public_see_active_laundries"
  ON laundries FOR SELECT
  TO authenticated, anon
  USING (status = 'active');

CREATE POLICY "admins_see_all_laundries"
  ON laundries FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "pending_visible_to_admin_and_owner"
  ON laundries FOR SELECT
  TO authenticated
  USING (
    status = 'pending_approval'
    AND (
      owner_user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
      )
    )
  );

-- Create updated_at trigger
CREATE TRIGGER update_laundries_updated_at
  BEFORE UPDATE ON laundries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
