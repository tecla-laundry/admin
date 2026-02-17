# Admin Dashboard

Production-grade Admin Dashboard for the Laundry Marketplace Platform.

## Tech Stack

- **Next.js 15** (App Router, React 19, Server Actions, Server Components)
- **TypeScript** (strict mode)
- **Tailwind CSS** + **shadcn/ui** + **Radix UI** + **Lucide icons**
- **TanStack Query v5** + **TanStack Table v8** (for data tables)
- **Recharts** (for analytics charts)
- **Supabase JS client v2** (Auth, PostgreSQL, Storage, Realtime, Edge Functions)
- **Zod** (form validation)
- **Next.js middleware** (route protection)

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase project with configured database

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` and add your Supabase credentials:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

### First Time Setup

1. **Database Setup**: Ensure your Supabase database has the following tables:
   - `profiles` (with `role` column: 'admin' | 'customer' | 'driver' | 'partner')
   - `laundries`
   - `drivers`
   - `orders`
   - `deliveries`
   - `admin_audit_logs`

2. **RLS Policies**: Set up Row Level Security policies in Supabase:
   - Admin users should have access to all tables
   - Ensure `profiles.role = 'admin'` check is enforced

3. **Create Admin User**: 
   - Sign up a user in Supabase Auth
   - Update the `profiles` table to set `role = 'admin'` for that user
   - Sign in at `/sign-in` with those credentials

## Project Structure

```
admin/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── admin/              # Protected admin routes
│   │   │   ├── layout.tsx     # Admin layout with sidebar
│   │   │   ├── page.tsx       # Dashboard overview
│   │   │   ├── laundries/     # Laundry partner management
│   │   │   ├── drivers/       # Driver management
│   │   │   ├── orders/        # Order & delivery management
│   │   │   ├── disputes/      # Dispute & issue management
│   │   │   ├── finance/       # Finance & commissions
│   │   │   ├── analytics/     # Analytics & reports
│   │   │   ├── admins/        # Admin user management
│   │   │   └── settings/      # Platform settings
│   │   ├── sign-in/           # Authentication page
│   │   └── 403/               # Access denied page
│   ├── components/
│   │   ├── ui/                # shadcn/ui components
│   │   └── layout/            # Layout components (Sidebar, Header)
│   ├── lib/
│   │   ├── supabase/         # Supabase client utilities
│   │   ├── providers.tsx     # React Query provider
│   │   └── utils.ts          # Utility functions
│   └── types/
│       └── database.ts       # TypeScript database types
├── middleware.ts              # Route protection middleware
└── .env.example              # Environment variables template
```

## Features

### Core Functionality

1. **Authentication & Authorization**
   - Supabase Auth integration
   - Middleware-based route protection
   - Admin role verification

2. **Dashboard Overview** (`/admin`)
   - KPI cards (Orders, Revenue, Active Laundries, Drivers, etc.)
   - Charts (Orders by status, Revenue trend)
   - Real-time activity feed

3. **Laundry Partner Management** (`/admin/laundries`)
   - Approval workflow (Pending, Active, Rejected, More Info Needed)
   - Advanced filters and bulk actions
   - Detail view with photos and location

4. **Driver Management** (`/admin/drivers`)
   - Driver list with performance metrics
   - Live location tracking
   - Approve/Suspend/Deactivate actions

5. **Order & Delivery Management** (`/admin/orders`)
   - Unified order table with full status machine
   - Filters and search
   - Manual intervention capabilities

6. **Dispute & Issue Management** (`/admin/disputes`)
   - Evidence viewer
   - Resolve/Refund/Escalate actions

7. **Finance & Commissions** (`/admin/finance`)
   - Commission management
   - Payout processing
   - Earnings reports

8. **Analytics & Reports** (`/admin/analytics`)
   - Geographic heat maps
   - Cohort analysis
   - Exportable reports

9. **Admin Management** (`/admin/admins`)
   - Invite new admins
   - Manage admin access

10. **Platform Settings** (`/admin/settings`)
    - Coverage areas
    - Dispatch settings
    - Feature flags

## Edge Functions Integration

The admin dashboard calls Supabase Edge Functions for critical operations:

- `approve_laundry_partner` - Approve laundry application
- `reject_laundry_partner` - Reject laundry application
- `request_more_info_laundry` - Request additional information
- `invite_admin` - Invite new admin user
- `process_payouts` - Process weekly payouts
- `dispatch_driver` - Re-dispatch driver for order
- `resolve_dispute` - Resolve order dispute
- `force_order_status` - Manual order status override

See `docs/prompts/functions/index.md` for complete function list.

## Development

### Type Checking
```bash
npm run type-check
```

### Linting
```bash
npm run lint
```

### Building for Production
```bash
npm run build
npm start
```

## Important Notes

- **RLS Policies**: All database queries are subject to Row Level Security. Ensure proper RLS policies are set up in Supabase.
- **Audit Logging**: All admin actions should be logged to `admin_audit_logs` table.
- **Real-time Updates**: Use Supabase Realtime subscriptions for live data updates.
- **Error Handling**: Implement proper error boundaries and user feedback.
- **Accessibility**: Follow WCAG 2.2 AA guidelines for all components.

## License

[Add your license here]
