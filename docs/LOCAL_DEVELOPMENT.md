# Local Development Setup Guide

This guide will help you set up the admin app to work with your local Supabase instance instead of the remote one.

## Prerequisites

1. **Supabase CLI installed**:
   ```bash
   npm install -g supabase
   ```

2. **Node.js 18+** installed

## Step 1: Start Local Supabase

1. Navigate to the supabase directory:
   ```bash
   cd ../supabase
   ```

2. Start local Supabase:
   ```bash
   supabase start
   ```

   This will start all Supabase services locally. Wait for it to complete.

3. **Get your local credentials**:
   ```bash
   supabase status
   ```

   This will output something like:
   ```
   API URL: http://127.0.0.1:54321
   GraphQL URL: http://127.0.0.1:54321/graphql/v1
   DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
   Studio URL: http://127.0.0.1:54323
   Inbucket URL: http://127.0.0.1:54324
   JWT secret: super-secret-jwt-token-with-at-least-32-characters-long
   anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

   **Copy the `anon key`** - you'll need it for the admin app.

## Step 2: Apply Database Migrations

1. Make sure you're in the supabase directory:
   ```bash
   cd ../supabase
   ```

2. Reset and apply all migrations (this will wipe existing data):
   ```bash
   supabase db reset
   ```

   Or if you want to keep existing data, just apply new migrations:
   ```bash
   supabase migration up
   ```

## Step 3: Seed Auth Users

1. Navigate to the supabase directory:
   ```bash
   cd ../supabase
   ```

2. Make sure the service_role key is available:
   ```bash
   supabase status > .temp/status.txt
   # Extract service_role key from the output and save to .temp/service-role-key
   # Or set it as environment variable: export SUPABASE_SERVICE_ROLE_KEY=your_key
   ```

3. Run the auth users seed script:
   ```bash
   node scripts/seed-auth-users.js
   ```

   This will create all the test users (admin, customers, laundry owners, drivers) that match the seed data migration.

## Step 4: Seed Test Data

1. The seed migration should already be applied if you ran `supabase db reset`
   
2. If you need to manually run it:
   ```bash
   psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -f migrations/20250217000015_seed_test_data.sql
   ```

## Step 5: Configure Admin App for Local Development

1. Navigate to the admin directory:
   ```bash
   cd ../admin
   ```

2. Create `.env.local` file:
   ```bash
   cp .env.local.example .env.local
   ```

3. Edit `.env.local` and add your local Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_local_anon_key_from_step_1
   ```

   Replace `your_local_anon_key_from_step_1` with the anon key you copied from `supabase status`.

## Step 6: Install Dependencies and Run Admin App

1. Install dependencies (if not already done):
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open your browser to: http://localhost:3000

## Step 7: Sign In

Use the test credentials created by the seed script:

- **Admin**: 
  - Email: `admin@test.com`
  - Password: `admin123456`

- **Customer**: 
  - Email: `john.doe@test.com`
  - Password: `customer123`

- **Laundry Owner**: 
  - Email: `mike@cleanlaundry.co.za`
  - Password: `laundry123`

- **Driver**: 
  - Email: `driver1@test.com`
  - Password: `driver123`

## Accessing Local Supabase Studio

You can access the local Supabase Studio (database management UI) at:
- **Studio URL**: http://127.0.0.1:54323

This gives you a visual interface to:
- View and edit database tables
- Run SQL queries
- View auth users
- Test Edge Functions
- View logs

## Accessing Local Email Testing (Inbucket)

When testing email functionality, emails are captured by Inbucket:
- **Inbucket URL**: http://127.0.0.1:54324

You can view all emails sent by the local Supabase instance here.

## Troubleshooting

### "Invalid API key" errors

1. Make sure you're using the **anon key**, not the service_role key
2. Verify the key matches what's shown in `supabase status`
3. Check that `.env.local` is in the admin directory root

### "Table does not exist" errors

1. Make sure you've run the migrations: `supabase db reset`
2. Check that all migration files are in `supabase/migrations/`

### "User not found" or authentication errors

1. Make sure you've run the auth users seed script: `node scripts/seed-auth-users.js`
2. Verify the user exists in Supabase Studio (http://127.0.0.1:54323)
3. Check that the profile was created with the correct role

### Local Supabase not starting

1. Make sure Docker is running (Supabase CLI uses Docker)
2. Check if ports 54321-54324 are already in use
3. Try stopping and restarting: `supabase stop && supabase start`

### Connection refused errors

1. Verify local Supabase is running: `supabase status`
2. Check the URL in `.env.local` matches the API URL from `supabase status`
3. Make sure you're using `http://127.0.0.1:54321` not `https://`

## Switching Between Local and Remote

To switch back to the remote Supabase instance:

1. Update `.env.local` with your remote credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_remote_anon_key
   ```

2. Restart the Next.js dev server

## Quick Reference

```bash
# Start local Supabase
cd supabase && supabase start

# Get local credentials
supabase status

# Reset database and apply all migrations
supabase db reset

# Seed auth users
node scripts/seed-auth-users.js

# Start admin app
cd admin && npm run dev

# Access Supabase Studio
open http://127.0.0.1:54323

# Access Inbucket (email testing)
open http://127.0.0.1:54324
```
