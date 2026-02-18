# Quick Start: Local Development Setup

This is a condensed guide to get the admin app running with local Supabase in 5 minutes.

## Prerequisites

- Node.js 18+
- Supabase CLI: `npm install -g supabase`
- Docker (Supabase CLI uses Docker)

## Step-by-Step

### 1. Start Local Supabase

```bash
cd ../supabase
supabase start
```

Wait for all services to start (this may take a minute or two).

### 2. Get Local Credentials

```bash
cd ../supabase
./scripts/get-local-credentials.sh
```

This extracts and saves your local Supabase credentials.

### 3. Seed Everything (Recommended)

```bash
cd ../supabase
./scripts/seed-all.sh
```

This will:
- Apply all migrations
- Seed auth users
- Seed all test data

**OR manually:**

### 3a. Apply Migrations

```bash
cd ../supabase
supabase db reset
```

### 3b. Seed Auth Users

```bash
cd ../supabase
# Install dependencies if needed
npm init -y && npm install @supabase/supabase-js
# Get credentials
./scripts/get-local-credentials.sh
# Seed auth users
node scripts/seed-auth-users.js
```

### 3c. Seed Test Data

```bash
cd ../supabase
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -f migrations/20250217000015_seed_test_data.sql
```

### 5. Configure Admin App

**Option A: Use the setup script (recommended)**
```bash
cd ../admin
./scripts/setup-local-env.sh
```

**Option B: Manual setup**
```bash
cd ../admin
cat > .env.local << EOF
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=$(cat ../supabase/.temp/anon-key)
EOF
```

### 6. Run Admin App

```bash
cd ../admin
npm install
npm run dev
```

### 7. Sign In

Open http://localhost:3000/sign-in and use:
- **Email**: `admin@test.com`
- **Password**: `admin123456`

## Useful URLs

- **Admin App**: http://localhost:3000
- **Supabase Studio**: http://127.0.0.1:54323
- **Email Testing (Inbucket)**: http://127.0.0.1:54324

## Troubleshooting

**"Service role key not found"**
```bash
cd ../supabase
./scripts/get-local-credentials.sh
```

**"Invalid API key"**
- Make sure you're using the anon key (not service_role)
- Verify `.env.local` has the correct key from `.temp/anon-key`

**"Table does not exist"**
```bash
cd ../supabase
supabase db reset
```

**"User not found"**
```bash
cd ../supabase
node scripts/seed-auth-users.js
```

## Test Credentials

All users have password pattern: `{role}123` or `{role}123456`

- **Admin**: `admin@test.com` / `admin123456`
- **Customer**: `john.doe@test.com` / `customer123`
- **Laundry**: `mike@cleanlaundry.co.za` / `laundry123`
- **Driver**: `driver1@test.com` / `driver123`

## Next Steps

- See [LOCAL_DEVELOPMENT.md](./LOCAL_DEVELOPMENT.md) for detailed documentation
- Check [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) for remote setup
