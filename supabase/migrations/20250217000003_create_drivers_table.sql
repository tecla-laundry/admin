-- Create drivers table
CREATE TABLE IF NOT EXISTS drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  vehicle_type TEXT NOT NULL CHECK (vehicle_type IN ('motorcycle', 'car', 'van', 'bicycle')),
  vehicle_registration TEXT NOT NULL UNIQUE,
  license_number TEXT NOT NULL,
  license_expiry DATE,
  current_latitude NUMERIC(10, 8),
  current_longitude NUMERIC(11, 8),
  last_location_updated_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT false NOT NULL,
  rating NUMERIC(3, 2) DEFAULT 0.00 CHECK (rating >= 0 AND rating <= 5.00),
  total_deliveries INTEGER DEFAULT 0 CHECK (total_deliveries >= 0),
  acceptance_rate NUMERIC(5, 2) DEFAULT 0.00 CHECK (acceptance_rate >= 0 AND acceptance_rate <= 100.00),
  on_time_percentage NUMERIC(5, 2) DEFAULT 0.00 CHECK (on_time_percentage >= 0 AND on_time_percentage <= 100.00),
  current_load INTEGER DEFAULT 0 CHECK (current_load >= 0),
  bank_details JSONB,
  profile_photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_drivers_user_id ON drivers(user_id);
CREATE INDEX IF NOT EXISTS idx_drivers_is_active ON drivers(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_drivers_location ON drivers USING GIST (point(current_longitude, current_latitude)) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_drivers_rating_acceptance ON drivers(rating DESC, acceptance_rate DESC) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_drivers_current_load ON drivers(current_load) WHERE is_active = true;

-- Enable RLS
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "drivers_manage_own_profile"
  ON drivers FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "admins_read_all_drivers"
  ON drivers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create updated_at trigger
CREATE TRIGGER update_drivers_updated_at
  BEFORE UPDATE ON drivers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create trigger to update last_location_updated_at
CREATE OR REPLACE FUNCTION update_driver_location_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.current_latitude IS DISTINCT FROM NEW.current_latitude 
     OR OLD.current_longitude IS DISTINCT FROM NEW.current_longitude THEN
    NEW.last_location_updated_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_driver_location_timestamp
  BEFORE UPDATE ON drivers
  FOR EACH ROW
  EXECUTE FUNCTION update_driver_location_timestamp();
