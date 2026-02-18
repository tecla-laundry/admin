-- Seed test data for all tables
-- 
-- IMPORTANT: This seed data requires corresponding auth.users entries to exist first.
-- The profiles table has a foreign key constraint to auth.users(id).
-- 
-- To use this seed data:
-- 1. Create auth.users entries via Supabase Dashboard, API, or CLI with matching UUIDs
-- 2. Or use a script that creates both auth.users and profiles together
-- 3. Or temporarily create auth.users entries using Supabase's auth admin functions
--
-- Example UUIDs used in this seed:
-- - Admin: 00000000-0000-0000-0000-000000000001
-- - Customers: 10000000-0000-0000-0000-000000000001 to 10000000-0000-0000-0000-000000000004
-- - Laundry Owners: 20000000-0000-0000-0000-000000000001 to 20000000-0000-0000-0000-000000000003
-- - Drivers: 30000000-0000-0000-0000-000000000001 to 30000000-0000-0000-0000-000000000003
--
-- This seed creates interconnected data across:
-- - Profiles (customers, laundry owners, drivers, admin)
-- - Laundries (linked to laundry owners)
-- - Drivers (linked to driver profiles)
-- - Orders (linked to customers and laundries)
-- - Order Items (linked to orders)
-- - Deliveries (linked to orders and drivers)
-- - Delivery Requests (linked to deliveries and drivers)
-- - Payments (linked to orders)
-- - Payouts (linked to payments/deliveries)
-- - Order Status History (linked to orders)
-- - Capacity Logs (linked to laundries and orders)
-- - Delivery Issues (linked to deliveries and orders)
-- - Admin Audit Logs (linked to admin profiles)
-- - Admin Invites (linked to admin profiles)

-- ============================================================================
-- PROFILES (Users)
-- ============================================================================
-- Note: These profiles will only be inserted if corresponding auth.users entries exist.
-- 
-- WORKFLOW:
-- 1. Run migrations: `supabase db reset` or `supabase migration up`
-- 2. Seed auth.users: `node scripts/seed-auth-users.js`
-- 3. Re-run this migration or manually insert profiles
-- 
-- OR run: `supabase db reset && node scripts/seed-auth-users.js && psql < migrations/20250217000015_seed_test_data.sql`

-- Admin profile (only insert if auth.users entry exists)
INSERT INTO profiles (id, role, full_name, phone, email, avatar_url)
SELECT '00000000-0000-0000-0000-000000000001', 'admin', 'Admin User', '+27123456789', 'admin@test.com', NULL
WHERE EXISTS (SELECT 1 FROM auth.users WHERE id = '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- Customer profiles (only insert if auth.users entries exist)
INSERT INTO profiles (id, role, full_name, phone, email, avatar_url)
SELECT v.id::uuid, 'customer', v.full_name, v.phone, v.email, NULL
FROM (VALUES
  ('10000000-0000-0000-0000-000000000001'::text, 'John Doe', '+27111111111', 'john.doe@test.com'),
  ('10000000-0000-0000-0000-000000000002'::text, 'Jane Smith', '+27111111112', 'jane.smith@test.com'),
  ('10000000-0000-0000-0000-000000000003'::text, 'Bob Johnson', '+27111111113', 'bob.johnson@test.com'),
  ('10000000-0000-0000-0000-000000000004'::text, 'Alice Williams', '+27111111114', 'alice.williams@test.com')
) AS v(id, full_name, phone, email)
WHERE EXISTS (SELECT 1 FROM auth.users WHERE auth.users.id = v.id::uuid)
ON CONFLICT (id) DO NOTHING;

-- Laundry owner profiles (only insert if auth.users entries exist)
INSERT INTO profiles (id, role, full_name, phone, email, avatar_url)
SELECT v.id::uuid, 'laundry_owner', v.full_name, v.phone, v.email, NULL
FROM (VALUES
  ('20000000-0000-0000-0000-000000000001'::text, 'Mike Laundry', '+27222222221', 'mike@cleanlaundry.co.za'),
  ('20000000-0000-0000-0000-000000000002'::text, 'Sarah Clean', '+27222222222', 'sarah@freshwash.co.za'),
  ('20000000-0000-0000-0000-000000000003'::text, 'Tom Fresh', '+27222222223', 'tom@quickwash.co.za')
) AS v(id, full_name, phone, email)
WHERE EXISTS (SELECT 1 FROM auth.users WHERE auth.users.id = v.id::uuid)
ON CONFLICT (id) DO NOTHING;

-- Driver profiles (only insert if auth.users entries exist)
INSERT INTO profiles (id, role, full_name, phone, email, avatar_url)
SELECT v.id::uuid, 'driver', v.full_name, v.phone, v.email, NULL
FROM (VALUES
  ('30000000-0000-0000-0000-000000000001'::text, 'Driver One', '+27333333331', 'driver1@test.com'),
  ('30000000-0000-0000-0000-000000000002'::text, 'Driver Two', '+27333333332', 'driver2@test.com'),
  ('30000000-0000-0000-0000-000000000003'::text, 'Driver Three', '+27333333333', 'driver3@test.com')
) AS v(id, full_name, phone, email)
WHERE EXISTS (SELECT 1 FROM auth.users WHERE auth.users.id = v.id::uuid)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- LAUNDRIES
-- ============================================================================
INSERT INTO laundries (
  id, owner_user_id, business_name, owner_name, email, phone, physical_address,
  latitude, longitude, status, services_offered, price_per_kg, capacity_per_day,
  operating_hours, bank_details, photos, rating, total_reviews, is_verified
) VALUES
(
  '40000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  'Clean Laundry Services',
  'Mike Laundry',
  'mike@cleanlaundry.co.za',
  '+27222222221',
  '123 Main Street, Johannesburg, 2000',
  -26.2041,
  28.0473,
  'active',
  '{"wash_and_fold": true, "dry_clean": true, "iron_only": true, "express": true}'::jsonb,
  25.00,
  500,
  '{"monday": {"open": "08:00", "close": "18:00"}, "tuesday": {"open": "08:00", "close": "18:00"}, "wednesday": {"open": "08:00", "close": "18:00"}, "thursday": {"open": "08:00", "close": "18:00"}, "friday": {"open": "08:00", "close": "18:00"}, "saturday": {"open": "09:00", "close": "14:00"}, "sunday": {"open": null, "close": null}}'::jsonb,
  '{"account_number": "1234567890", "bank_name": "Standard Bank", "account_holder": "Clean Laundry Services"}'::jsonb,
  ARRAY['https://example.com/laundry1.jpg'],
  4.5,
  120,
  true
),
(
  '40000000-0000-0000-0000-000000000002',
  '20000000-0000-0000-0000-000000000002',
  'Fresh Wash Express',
  'Sarah Clean',
  'sarah@freshwash.co.za',
  '+27222222222',
  '456 Oak Avenue, Cape Town, 8001',
  -33.9249,
  18.4241,
  'active',
  '{"wash_and_fold": true, "dry_clean": false, "iron_only": true, "express": true}'::jsonb,
  22.50,
  300,
  '{"monday": {"open": "07:00", "close": "19:00"}, "tuesday": {"open": "07:00", "close": "19:00"}, "wednesday": {"open": "07:00", "close": "19:00"}, "thursday": {"open": "07:00", "close": "19:00"}, "friday": {"open": "07:00", "close": "19:00"}, "saturday": {"open": "08:00", "close": "16:00"}, "sunday": {"open": "09:00", "close": "13:00"}}'::jsonb,
  '{"account_number": "0987654321", "bank_name": "FNB", "account_holder": "Fresh Wash Express"}'::jsonb,
  ARRAY['https://example.com/laundry2.jpg'],
  4.8,
  95,
  true
),
(
  '40000000-0000-0000-0000-000000000003',
  '20000000-0000-0000-0000-000000000003',
  'Quick Wash Hub',
  'Tom Fresh',
  'tom@quickwash.co.za',
  '+27222222223',
  '789 Pine Road, Durban, 4001',
  -29.8587,
  31.0218,
  'active',
  '{"wash_and_fold": true, "dry_clean": true, "iron_only": false, "express": false}'::jsonb,
  20.00,
  400,
  '{"monday": {"open": "08:00", "close": "17:00"}, "tuesday": {"open": "08:00", "close": "17:00"}, "wednesday": {"open": "08:00", "close": "17:00"}, "thursday": {"open": "08:00", "close": "17:00"}, "friday": {"open": "08:00", "close": "17:00"}, "saturday": {"open": "09:00", "close": "13:00"}, "sunday": {"open": null, "close": null}}'::jsonb,
  '{"account_number": "5555555555", "bank_name": "Nedbank", "account_holder": "Quick Wash Hub"}'::jsonb,
  ARRAY['https://example.com/laundry3.jpg'],
  4.2,
  75,
  false
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- DRIVERS
-- ============================================================================
INSERT INTO drivers (
  id, user_id, vehicle_type, vehicle_registration, license_number, license_expiry,
  current_latitude, current_longitude, is_active, rating, total_deliveries,
  acceptance_rate, on_time_percentage, current_load, bank_details
) VALUES
(
  '50000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000001',
  'motorcycle',
  'CA123456',
  'DL789012',
  '2025-12-31',
  -26.2041,
  28.0473,
  true,
  4.7,
  150,
  95.5,
  92.0,
  0,
  '{"account_number": "1111111111", "bank_name": "Standard Bank", "account_holder": "Driver One"}'::jsonb
),
(
  '50000000-0000-0000-0000-000000000002',
  '30000000-0000-0000-0000-000000000002',
  'car',
  'CA789012',
  'DL345678',
  '2026-06-30',
  -33.9249,
  18.4241,
  true,
  4.9,
  200,
  98.0,
  95.5,
  1,
  '{"account_number": "2222222222", "bank_name": "FNB", "account_holder": "Driver Two"}'::jsonb
),
(
  '50000000-0000-0000-0000-000000000003',
  '30000000-0000-0000-0000-000000000003',
  'van',
  'CA345678',
  'DL901234',
  '2025-09-15',
  -29.8587,
  31.0218,
  true,
  4.5,
  120,
  90.0,
  88.0,
  0,
  '{"account_number": "3333333333", "bank_name": "Nedbank", "account_holder": "Driver Three"}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- ORDERS
-- ============================================================================
INSERT INTO orders (
  id, customer_id, laundry_id, status, total_price, service_fee, pickup_fee,
  commission_amount, platform_fee, pickup_address, pickup_latitude, pickup_longitude,
  dropoff_address, dropoff_latitude, dropoff_longitude, scheduled_pickup_time,
  estimated_completion_time, total_weight_kg, special_notes, completed_at
) VALUES
(
  '60000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000001',
  'completed',
  150.00,
  10.00,
  15.00,
  30.00,
  5.00,
  '100 Customer Street, Johannesburg, 2000',
  -26.2050,
  28.0480,
  '100 Customer Street, Johannesburg, 2000',
  -26.2050,
  28.0480,
  NOW() - INTERVAL '3 days',
  NOW() - INTERVAL '2 days',
  5.5,
  'Please handle with care',
  NOW() - INTERVAL '2 days'
),
(
  '60000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000002',
  '40000000-0000-0000-0000-000000000001',
  'at_laundry',
  200.00,
  15.00,
  20.00,
  40.00,
  7.50,
  '200 Jane Avenue, Johannesburg, 2000',
  -26.2100,
  28.0500,
  '200 Jane Avenue, Johannesburg, 2000',
  -26.2100,
  28.0500,
  NOW() - INTERVAL '1 day',
  NOW() + INTERVAL '1 day',
  7.0,
  'Express service needed',
  NULL
),
(
  '60000000-0000-0000-0000-000000000003',
  '10000000-0000-0000-0000-000000000003',
  '40000000-0000-0000-0000-000000000002',
  'delivery_in_progress',
  175.00,
  12.00,
  18.00,
  35.00,
  6.00,
  '300 Bob Road, Cape Town, 8001',
  -33.9250,
  18.4250,
  '300 Bob Road, Cape Town, 8001',
  -33.9250,
  18.4250,
  NOW() - INTERVAL '2 days',
  NOW() + INTERVAL '2 hours',
  6.5,
  NULL,
  NULL
),
(
  '60000000-0000-0000-0000-000000000004',
  '10000000-0000-0000-0000-000000000004',
  '40000000-0000-0000-0000-000000000002',
  'pickup_in_progress',
  120.00,
  8.00,
  12.00,
  24.00,
  4.00,
  '400 Alice Lane, Cape Town, 8001',
  -33.9300,
  18.4300,
  '400 Alice Lane, Cape Town, 8001',
  -33.9300,
  18.4300,
  NOW() - INTERVAL '1 hour',
  NOW() + INTERVAL '1 day',
  4.0,
  'Fragile items included',
  NULL
),
(
  '60000000-0000-0000-0000-000000000005',
  '10000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000003',
  'accepted',
  90.00,
  5.00,
  10.00,
  18.00,
  3.50,
  '500 John Street, Durban, 4001',
  -29.8590,
  31.0220,
  '500 John Street, Durban, 4001',
  -29.8590,
  31.0220,
  NOW() + INTERVAL '2 hours',
  NOW() + INTERVAL '2 days',
  3.5,
  NULL,
  NULL
),
(
  '60000000-0000-0000-0000-000000000006',
  '10000000-0000-0000-0000-000000000002',
  '40000000-0000-0000-0000-000000000003',
  'pending',
  110.00,
  7.00,
  12.00,
  22.00,
  4.00,
  '600 Jane Boulevard, Durban, 4001',
  -29.8600,
  31.0230,
  '600 Jane Boulevard, Durban, 4001',
  -29.8600,
  31.0230,
  NOW() + INTERVAL '1 day',
  NULL,
  4.5,
  NULL,
  NULL
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- ORDER ITEMS
-- ============================================================================
INSERT INTO order_items (id, order_id, service_type, quantity, unit_price, total_price, description) VALUES
('70000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', 'wash_and_fold', 5.5, 25.00, 137.50, 'Regular wash and fold'),
('70000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000001', 'iron_only', 2.0, 15.00, 30.00, 'Ironing service'),
('70000000-0000-0000-0000-000000000003', '60000000-0000-0000-0000-000000000002', 'wash_and_fold', 5.0, 25.00, 125.00, 'Regular wash and fold'),
('70000000-0000-0000-0000-000000000004', '60000000-0000-0000-0000-000000000002', 'express', 2.0, 30.00, 60.00, 'Express service'),
('70000000-0000-0000-0000-000000000005', '60000000-0000-0000-0000-000000000003', 'wash_and_fold', 4.5, 22.50, 101.25, 'Regular wash and fold'),
('70000000-0000-0000-0000-000000000006', '60000000-0000-0000-0000-000000000003', 'dry_clean', 2.0, 35.00, 70.00, 'Dry cleaning service'),
('70000000-0000-0000-0000-000000000007', '60000000-0000-0000-0000-000000000004', 'wash_and_fold', 4.0, 22.50, 90.00, 'Regular wash and fold'),
('70000000-0000-0000-0000-000000000008', '60000000-0000-0000-0000-000000000004', 'iron_only', 1.5, 12.00, 18.00, 'Ironing service'),
('70000000-0000-0000-0000-000000000009', '60000000-0000-0000-0000-000000000005', 'wash_and_fold', 3.5, 20.00, 70.00, 'Regular wash and fold'),
('70000000-0000-0000-0000-000000000010', '60000000-0000-0000-0000-000000000006', 'wash_and_fold', 4.5, 20.00, 90.00, 'Regular wash and fold'),
('70000000-0000-0000-0000-000000000011', '60000000-0000-0000-0000-000000000006', 'iron_only', 1.0, 10.00, 10.00, 'Ironing service')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- DELIVERIES
-- ============================================================================
INSERT INTO deliveries (
  id, order_id, driver_id, type, status, pickup_photo_urls, delivery_photo_urls,
  otp_code, estimated_arrival_time, actual_pickup_time, actual_delivery_time, note
) VALUES
(
  '80000000-0000-0000-0000-000000000001',
  '60000000-0000-0000-0000-000000000001',
  '50000000-0000-0000-0000-000000000001',
  'pickup',
  'completed',
  ARRAY['https://example.com/pickup1.jpg'],
  NULL,
  '1234',
  NOW() - INTERVAL '3 days' + INTERVAL '30 minutes',
  NOW() - INTERVAL '3 days' + INTERVAL '25 minutes',
  NULL,
  'Picked up successfully'
),
(
  '80000000-0000-0000-0000-000000000002',
  '60000000-0000-0000-0000-000000000001',
  '50000000-0000-0000-0000-000000000001',
  'delivery',
  'completed',
  NULL,
  ARRAY['https://example.com/delivery1.jpg'],
  '5678',
  NOW() - INTERVAL '2 days' + INTERVAL '2 hours',
  NULL,
  NOW() - INTERVAL '2 days' + INTERVAL '2 hours',
  'Delivered successfully'
),
(
  '80000000-0000-0000-0000-000000000003',
  '60000000-0000-0000-0000-000000000002',
  '50000000-0000-0000-0000-000000000001',
  'pickup',
  'completed',
  ARRAY['https://example.com/pickup2.jpg'],
  NULL,
  '9012',
  NOW() - INTERVAL '1 day' + INTERVAL '1 hour',
  NOW() - INTERVAL '1 day' + INTERVAL '55 minutes',
  NULL,
  'Picked up on time'
),
(
  '80000000-0000-0000-0000-000000000004',
  '60000000-0000-0000-0000-000000000003',
  '50000000-0000-0000-0000-000000000002',
  'pickup',
  'completed',
  ARRAY['https://example.com/pickup3.jpg'],
  NULL,
  '3456',
  NOW() - INTERVAL '2 days' + INTERVAL '3 hours',
  NOW() - INTERVAL '2 days' + INTERVAL '2 hours 50 minutes',
  NULL,
  'Pickup completed'
),
(
  '80000000-0000-0000-0000-000000000005',
  '60000000-0000-0000-0000-000000000003',
  '50000000-0000-0000-0000-000000000002',
  'delivery',
  'in_progress',
  NULL,
  NULL,
  '7890',
  NOW() + INTERVAL '30 minutes',
  NULL,
  NULL,
  'On the way'
),
(
  '80000000-0000-0000-0000-000000000006',
  '60000000-0000-0000-0000-000000000004',
  '50000000-0000-0000-0000-000000000003',
  'pickup',
  'in_progress',
  NULL,
  NULL,
  '2468',
  NOW() + INTERVAL '15 minutes',
  NULL,
  NULL,
  'Heading to pickup location'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- DELIVERY REQUESTS
-- ============================================================================
INSERT INTO delivery_requests (
  id, delivery_id, driver_id, status, expires_at, rejection_reason
) VALUES
(
  '90000000-0000-0000-0000-000000000001',
  '80000000-0000-0000-0000-000000000001',
  '50000000-0000-0000-0000-000000000001',
  'accepted',
  NOW() - INTERVAL '3 days' + INTERVAL '1 hour',
  NULL
),
(
  '90000000-0000-0000-0000-000000000002',
  '80000000-0000-0000-0000-000000000002',
  '50000000-0000-0000-0000-000000000001',
  'accepted',
  NOW() - INTERVAL '2 days' + INTERVAL '3 hours',
  NULL
),
(
  '90000000-0000-0000-0000-000000000003',
  '80000000-0000-0000-0000-000000000003',
  '50000000-0000-0000-0000-000000000001',
  'accepted',
  NOW() - INTERVAL '1 day' + INTERVAL '2 hours',
  NULL
),
(
  '90000000-0000-0000-0000-000000000004',
  '80000000-0000-0000-0000-000000000004',
  '50000000-0000-0000-0000-000000000002',
  'accepted',
  NOW() - INTERVAL '2 days' + INTERVAL '4 hours',
  NULL
),
(
  '90000000-0000-0000-0000-000000000005',
  '80000000-0000-0000-0000-000000000005',
  '50000000-0000-0000-0000-000000000002',
  'accepted',
  NOW() - INTERVAL '1 hour',
  NULL
),
(
  '90000000-0000-0000-0000-000000000006',
  '80000000-0000-0000-0000-000000000006',
  '50000000-0000-0000-0000-000000000003',
  'accepted',
  NOW() - INTERVAL '30 minutes',
  NULL
),
(
  '90000000-0000-0000-0000-000000000007',
  '80000000-0000-0000-0000-000000000005',
  '50000000-0000-0000-0000-000000000001',
  'rejected',
  NOW() - INTERVAL '2 hours',
  'Too far from current location'
),
(
  '90000000-0000-0000-0000-000000000008',
  '80000000-0000-0000-0000-000000000006',
  '50000000-0000-0000-0000-000000000001',
  'rejected',
  NOW() - INTERVAL '1 hour',
  'Already have a delivery in progress'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- PAYMENTS
-- ============================================================================
INSERT INTO payments (
  id, order_id, customer_id, amount, currency, payment_method,
  payment_provider_transaction_id, status, escrow_status, commission_amount,
  platform_fee, laundry_payout_amount, driver_payout_amount, paid_at, released_at
) VALUES
(
  'a0000000-0000-0000-0000-000000000001',
  '60000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  175.00,
  'ZAR',
  'paystack',
  'txn_paystack_001',
  'completed',
  'released',
  30.00,
  5.00,
  140.00,
  0.00,
  NOW() - INTERVAL '3 days',
  NOW() - INTERVAL '2 days'
),
(
  'a0000000-0000-0000-0000-000000000002',
  '60000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000002',
  235.00,
  'ZAR',
  'yoco',
  'txn_yoco_001',
  'completed',
  'held',
  40.00,
  7.50,
  187.50,
  0.00,
  NOW() - INTERVAL '1 day',
  NULL
),
(
  'a0000000-0000-0000-0000-000000000003',
  '60000000-0000-0000-0000-000000000003',
  '10000000-0000-0000-0000-000000000003',
  205.00,
  'ZAR',
  'payfast',
  'txn_payfast_001',
  'completed',
  'held',
  35.00,
  6.00,
  164.00,
  0.00,
  NOW() - INTERVAL '2 days',
  NULL
),
(
  'a0000000-0000-0000-0000-000000000004',
  '60000000-0000-0000-0000-000000000004',
  '10000000-0000-0000-0000-000000000004',
  140.00,
  'ZAR',
  'paystack',
  'txn_paystack_002',
  'processing',
  'held',
  24.00,
  4.00,
  112.00,
  0.00,
  NOW() - INTERVAL '1 hour',
  NULL
),
(
  'a0000000-0000-0000-0000-000000000005',
  '60000000-0000-0000-0000-000000000005',
  '10000000-0000-0000-0000-000000000001',
  108.50,
  'ZAR',
  'yoco',
  NULL,
  'pending',
  'held',
  18.00,
  3.50,
  87.00,
  0.00,
  NULL,
  NULL
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- PAYOUTS
-- ============================================================================
INSERT INTO payouts (
  id, recipient_type, recipient_id, payment_id, delivery_id, amount, currency,
  status, period_start, period_end, bank_account_details, processed_at
) VALUES
(
  'b0000000-0000-0000-0000-000000000001',
  'laundry',
  '40000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  NULL,
  140.00,
  'ZAR',
  'completed',
  CURRENT_DATE - INTERVAL '3 days',
  CURRENT_DATE - INTERVAL '2 days',
  '{"account_number": "1234567890", "bank_name": "Standard Bank"}'::jsonb,
  NOW() - INTERVAL '2 days'
),
(
  'b0000000-0000-0000-0000-000000000002',
  'driver',
  '50000000-0000-0000-0000-000000000001',
  NULL,
  '80000000-0000-0000-0000-000000000001',
  15.00,
  'ZAR',
  'completed',
  CURRENT_DATE - INTERVAL '3 days',
  CURRENT_DATE - INTERVAL '2 days',
  '{"account_number": "1111111111", "bank_name": "Standard Bank"}'::jsonb,
  NOW() - INTERVAL '2 days'
),
(
  'b0000000-0000-0000-0000-000000000003',
  'driver',
  '50000000-0000-0000-0000-000000000001',
  NULL,
  '80000000-0000-0000-0000-000000000002',
  20.00,
  'ZAR',
  'completed',
  CURRENT_DATE - INTERVAL '2 days',
  CURRENT_DATE - INTERVAL '1 day',
  '{"account_number": "1111111111", "bank_name": "Standard Bank"}'::jsonb,
  NOW() - INTERVAL '1 day'
),
(
  'b0000000-0000-0000-0000-000000000004',
  'laundry',
  '40000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000002',
  NULL,
  187.50,
  'ZAR',
  'pending',
  CURRENT_DATE - INTERVAL '1 day',
  CURRENT_DATE,
  '{"account_number": "1234567890", "bank_name": "Standard Bank"}'::jsonb,
  NULL
),
(
  'b0000000-0000-0000-0000-000000000005',
  'driver',
  '50000000-0000-0000-0000-000000000002',
  NULL,
  '80000000-0000-0000-0000-000000000004',
  18.00,
  'ZAR',
  'pending',
  CURRENT_DATE - INTERVAL '2 days',
  CURRENT_DATE,
  '{"account_number": "2222222222", "bank_name": "FNB"}'::jsonb,
  NULL
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- ORDER STATUS HISTORY
-- ============================================================================
INSERT INTO order_status_history (
  id, order_id, from_status, to_status, performed_by, performed_by_role, metadata, performed_at
) VALUES
(1, '60000000-0000-0000-0000-000000000001', NULL, 'pending', '10000000-0000-0000-0000-000000000001', 'customer', NULL, NOW() - INTERVAL '3 days'),
(2, '60000000-0000-0000-0000-000000000001', 'pending', 'laundry_requested', '10000000-0000-0000-0000-000000000001', 'customer', NULL, NOW() - INTERVAL '3 days' + INTERVAL '5 minutes'),
(3, '60000000-0000-0000-0000-000000000001', 'laundry_requested', 'accepted', '20000000-0000-0000-0000-000000000001', 'laundry_owner', NULL, NOW() - INTERVAL '3 days' + INTERVAL '10 minutes'),
(4, '60000000-0000-0000-0000-000000000001', 'accepted', 'driver_pickup_assigned', NULL, 'system', NULL, NOW() - INTERVAL '3 days' + INTERVAL '15 minutes'),
(5, '60000000-0000-0000-0000-000000000001', 'driver_pickup_assigned', 'pickup_in_progress', '30000000-0000-0000-0000-000000000001', 'driver', NULL, NOW() - INTERVAL '3 days' + INTERVAL '20 minutes'),
(6, '60000000-0000-0000-0000-000000000001', 'pickup_in_progress', 'picked_up', '30000000-0000-0000-0000-000000000001', 'driver', NULL, NOW() - INTERVAL '3 days' + INTERVAL '30 minutes'),
(7, '60000000-0000-0000-0000-000000000001', 'picked_up', 'at_laundry', NULL, 'system', NULL, NOW() - INTERVAL '3 days' + INTERVAL '1 hour'),
(8, '60000000-0000-0000-0000-000000000001', 'at_laundry', 'washing_in_progress', '20000000-0000-0000-0000-000000000001', 'laundry_owner', NULL, NOW() - INTERVAL '2 days' + INTERVAL '12 hours'),
(9, '60000000-0000-0000-0000-000000000001', 'washing_in_progress', 'ready_for_delivery', '20000000-0000-0000-0000-000000000001', 'laundry_owner', NULL, NOW() - INTERVAL '2 days' + INTERVAL '18 hours'),
(10, '60000000-0000-0000-0000-000000000001', 'ready_for_delivery', 'driver_delivery_assigned', NULL, 'system', NULL, NOW() - INTERVAL '2 days' + INTERVAL '20 hours'),
(11, '60000000-0000-0000-0000-000000000001', 'driver_delivery_assigned', 'delivery_in_progress', '30000000-0000-0000-0000-000000000001', 'driver', NULL, NOW() - INTERVAL '2 days' + INTERVAL '21 hours'),
(12, '60000000-0000-0000-0000-000000000001', 'delivery_in_progress', 'completed', '30000000-0000-0000-0000-000000000001', 'driver', NULL, NOW() - INTERVAL '2 days' + INTERVAL '22 hours'),
(13, '60000000-0000-0000-0000-000000000002', NULL, 'pending', '10000000-0000-0000-0000-000000000002', 'customer', NULL, NOW() - INTERVAL '1 day'),
(14, '60000000-0000-0000-0000-000000000002', 'pending', 'laundry_requested', '10000000-0000-0000-0000-000000000002', 'customer', NULL, NOW() - INTERVAL '1 day' + INTERVAL '5 minutes'),
(15, '60000000-0000-0000-0000-000000000002', 'laundry_requested', 'accepted', '20000000-0000-0000-0000-000000000001', 'laundry_owner', NULL, NOW() - INTERVAL '1 day' + INTERVAL '10 minutes'),
(16, '60000000-0000-0000-0000-000000000002', 'accepted', 'driver_pickup_assigned', NULL, 'system', NULL, NOW() - INTERVAL '1 day' + INTERVAL '15 minutes'),
(17, '60000000-0000-0000-0000-000000000002', 'driver_pickup_assigned', 'pickup_in_progress', '30000000-0000-0000-0000-000000000001', 'driver', NULL, NOW() - INTERVAL '1 day' + INTERVAL '20 minutes'),
(18, '60000000-0000-0000-0000-000000000002', 'pickup_in_progress', 'picked_up', '30000000-0000-0000-0000-000000000001', 'driver', NULL, NOW() - INTERVAL '1 day' + INTERVAL '30 minutes'),
(19, '60000000-0000-0000-0000-000000000002', 'picked_up', 'at_laundry', NULL, 'system', NULL, NOW() - INTERVAL '1 day' + INTERVAL '1 hour')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- CAPACITY LOGS
-- ============================================================================
INSERT INTO capacity_logs (
  id, laundry_id, date, total_capacity_kg, used_capacity_kg, remaining_capacity_kg,
  order_id, action, amount_kg, notes
) VALUES
(
  'c0000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000001',
  CURRENT_DATE - INTERVAL '3 days',
  500,
  0,
  500,
  NULL,
  'reset',
  0,
  'Daily capacity reset'
),
(
  'c0000000-0000-0000-0000-000000000002',
  '40000000-0000-0000-0000-000000000001',
  CURRENT_DATE - INTERVAL '3 days',
  500,
  5.5,
  494.5,
  '60000000-0000-0000-0000-000000000001',
  'deduct',
  5.5,
  'Order capacity deduction'
),
(
  'c0000000-0000-0000-0000-000000000003',
  '40000000-0000-0000-0000-000000000001',
  CURRENT_DATE - INTERVAL '1 day',
  500,
  0,
  500,
  NULL,
  'reset',
  0,
  'Daily capacity reset'
),
(
  'c0000000-0000-0000-0000-000000000004',
  '40000000-0000-0000-0000-000000000001',
  CURRENT_DATE - INTERVAL '1 day',
  500,
  7.0,
  493.0,
  '60000000-0000-0000-0000-000000000002',
  'deduct',
  7.0,
  'Order capacity deduction'
),
(
  'c0000000-0000-0000-0000-000000000005',
  '40000000-0000-0000-0000-000000000002',
  CURRENT_DATE - INTERVAL '2 days',
  300,
  0,
  300,
  NULL,
  'reset',
  0,
  'Daily capacity reset'
),
(
  'c0000000-0000-0000-0000-000000000006',
  '40000000-0000-0000-0000-000000000002',
  CURRENT_DATE - INTERVAL '2 days',
  300,
  6.5,
  293.5,
  '60000000-0000-0000-0000-000000000003',
  'deduct',
  6.5,
  'Order capacity deduction'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- DELIVERY ISSUES
-- ============================================================================
INSERT INTO delivery_issues (
  id, delivery_id, order_id, reported_by, reported_by_role, reason, description,
  photo_urls, severity, status, resolved_by, resolved_at, resolution_notes
) VALUES
(
  'd0000000-0000-0000-0000-000000000001',
  '80000000-0000-0000-0000-000000000002',
  '60000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'customer',
  'late_delivery',
  'Delivery was 30 minutes late',
  ARRAY['https://example.com/issue1.jpg'],
  'medium',
  'resolved',
  '00000000-0000-0000-0000-000000000001',
  NOW() - INTERVAL '1 day',
  'Driver was stuck in traffic. Compensation provided.'
),
(
  'd0000000-0000-0000-0000-000000000002',
  '80000000-0000-0000-0000-000000000005',
  '60000000-0000-0000-0000-000000000003',
  '10000000-0000-0000-0000-000000000003',
  'customer',
  'wrong_address',
  'Driver went to wrong address initially',
  NULL,
  'low',
  'open',
  NULL,
  NULL,
  NULL
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- ADMIN AUDIT LOGS
-- ============================================================================
INSERT INTO admin_audit_logs (
  id, performed_by, action, target_type, target_id, details, ip_address, user_agent
) VALUES
(
  'e0000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'approve_laundry',
  'laundry',
  '40000000-0000-0000-0000-000000000001',
  jsonb_build_object('status', 'active', 'approved_at', (NOW() - INTERVAL '30 days')::text),
  '192.168.1.1',
  'Mozilla/5.0'
),
(
  'e0000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'approve_laundry',
  'laundry',
  '40000000-0000-0000-0000-000000000002',
  jsonb_build_object('status', 'active', 'approved_at', (NOW() - INTERVAL '25 days')::text),
  '192.168.1.1',
  'Mozilla/5.0'
),
(
  'e0000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000001',
  'resolve_issue',
  'dispute',
  'd0000000-0000-0000-0000-000000000001',
  '{"resolution": "compensation_provided", "amount": 50.00}'::jsonb,
  '192.168.1.1',
  'Mozilla/5.0'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- ADMIN INVITES
-- ============================================================================
INSERT INTO admin_invites (
  id, email, token, invited_by, role, expires_at, claimed_at, claimed_by, is_active
) VALUES
(
  'f0000000-0000-0000-0000-000000000001',
  'newadmin@test.com',
  '11111111-1111-1111-1111-111111111111',
  '00000000-0000-0000-0000-000000000001',
  'admin',
  NOW() + INTERVAL '7 days',
  NULL,
  NULL,
  true
),
(
  'f0000000-0000-0000-0000-000000000002',
  'claimedadmin@test.com',
  '22222222-2222-2222-2222-222222222222',
  '00000000-0000-0000-0000-000000000001',
  'admin',
  NOW() + INTERVAL '30 days',
  NOW() - INTERVAL '10 days',
  '00000000-0000-0000-0000-000000000001',
  false
)
ON CONFLICT (id) DO NOTHING;
